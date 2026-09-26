---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "デスクトップのプラグイン SDK（@hermes/plugin-sdk）"
description: "ネイティブの Hermes Desktop アプリを拡張します。ペイン、ページ、サイドバーのナビ、ステータスバー、パレットのコマンド、キー割り当て、テーマ、そしてプラグイン専用のバックエンドの名前空間を、import 1 行・ビルド不要で追加できます。"
upstream_path: developer-guide/desktop-plugin-sdk.md
upstream_blob: 790b60d946d9fbba3e0126883836cb65023c9f19
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk
---

# デスクトップのプラグイン SDK {#desktop-plugin-sdk}

ネイティブの [Hermes Desktop](/hermes/docs/user-guide/desktop/) アプリは、コントリビューションで
組み立てられています。ウィンドウ内のあらゆる面 — ペイン、ルート、サイドバーのナビ、
ステータスバーの項目、パレットの項目、キー割り当て、テーマ — が、1 つの中央の登録簿に
登録されます。中核部分も、プラグインとまったく同じやり方で自分の面を登録しているので、
プラグインの仕組みは後付けではなく本物です。

**デスクトップのプラグイン**は、`HermesPlugin` を default export する 1 つの ESM ファイルです。
読み込むモジュールは `@hermes/plugin-sdk` の 1 つだけで、そこから全部が手に入ります。アプリの
現在の状態、ゲートウェイの JSON-RPC の窓口、プラグイン専用の REST とソケットの名前空間、
React Query、そしてアプリ自身の UI キットです。おかげでプラグインの UI は何もしなくても
アプリに馴染みます。リポジトリのクローンも、`npm run build` も、アプリのソースへのパッチも要りません。
ファイルを `$HERMES_HOME/desktop-plugins/<id>/plugin.js` に置けば、アプリが数秒で読み込み、
保存のたびにその場で入れ替えます。

:::warning これはウェブのダッシュボード用のプラグイン SDK ではありません
Hermes では「プラグイン」という言葉がいくつかの別物を指します。このページは**ネイティブの
デスクトップアプリ**（`hermes desktop`）の SDK、つまり `@hermes/plugin-sdk` モジュールと
`$HERMES_HOME/desktop-plugins/` の話です。**ウェブのダッシュボード**（`hermes dashboard`）には、
`manifest.json` と `window.__HERMES_PLUGIN_SDK__` を使う、これとは無関係の別のプラグインの仕組みが
あります。そちらは[ダッシュボードを拡張する](/hermes/docs/user-guide/features/extending-the-dashboard/)で
説明しています。Python の CLI・ゲートウェイのプラグインは[Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/)にあります。
この 3 つは、コードも API も配り方も共有していません。デスクトップとダッシュボードの SDK で
共通なのは、バックエンドの `plugin_api.py` の名前空間（`/api/plugins/<id>`）だけです。
:::

## 頭の中の見取り図 {#mental-model}

この SDK は VS Code と同じモジュールの考え方をとっています。プラグインの作者が読み込むのは
きっかり 1 つのモジュールだけで、アプリの内部には触れません（同梱プラグインでは lint で遮られ、
ディスク上のプラグインでは解決に失敗します）。できることは段階に分かれています。

- **`host.state.*`** — アプリの現在の状態（nanostore の atom）を読み取り専用で見るものです。
  動いているセッション、セッションごとのターンの進行中フラグ、作業ディレクトリ、ゲートウェイの
  ソケットの状態、モデル、プロファイル、表示領域。`gateway` はターンの進行中ではなく WebSocket です。
- **`host.*` の操作** — 選び抜かれた安全な動詞です。トースト表示、画面移動、ログの追尾、
  ゲートウェイの再起動、ゲートウェイのイベントの購読。
- **`host.request`** — ゲートウェイの JSON-RPC の窓口です。セッション、設定、スキル、cron など、
  アプリ自身が呼んでいるものすべて。
- **`captureGatewayFileDownload()`** — ゲートウェイのファイルを保存する操作を、REST での読み取りを
  始める直前に捕まえ、返ってきたデータと一緒に持っておくものです。この操作
  `(storedPath, suggestedName) => Promise<void>` は、クリックの前に利用者が接続先を切り替えても、
  その読み取りのときの接続とプロファイルの範囲を保ちます。呼ぶのは、利用者がはっきりダウンロードの
  操作をしたときだけにしてください。パスには、推測した作業領域のパスではなく、バックエンドが保存した
  ファイルのパスを使います。認証付きのストリーミング、ネイティブの保存ダイアログ、古いゲートウェイ
  向けの代替は Electron が受け持ちます。プラグインが資格情報を受け取ることはなく、遠隔のパスを
  `file://` で開くこともありません。ホストは Files のパネルと同じ「Saved」「Download failed」の
  トーストを出し、キャンセルのときは何も出しません。Promise は保存が終わったときに決着し、
  拒否されることはありません。
- **`ctx.rest` / `ctx.socket`** — `plugin_api.py` を同梱するなら使える、そのプラグイン専用の
  バックエンドの名前空間（`/api/plugins/<id>`）です。
- **`ui.*`** — 見た目の言語です。アプリの本物のコンポーネント、テーマの変数、アイコン、
  整形処理が手に入るので、UI がアプリと 1 ピクセル単位で揃います。

## 配り方は 2 通り {#two-delivery-modes}

| 方式 | 置き場所 | 誰が | ビルド |
|------|-------|-----|------------|
| **ディスク**（推奨） | `$HERMES_HOME/desktop-plugins/<id>/plugin.js` | 利用者、エージェント | 不要 — 素の ESM をそのまま読み込みます |
| **一体型のパッケージ** | `$HERMES_HOME/plugins/<id>/desktop/plugin.js` | エージェント側のコードも同梱するプラグイン | 不要 — 同じディスク経路です |
| **同梱** | `apps/desktop/src/plugins/<id>/plugin.tsx` | ツリー内で、アプリと一緒に配られるもの | アプリ自身の Vite ビルド |

3 つとも同じ `HermesPlugin` の取り決めに従い、**Capabilities → Plugins** に現れ、その場で
有効・無効を切り替えられます。一体型のパッケージは、エージェントのプラグインのフォルダーの中まで
ディスクの窓口が見に行くだけのものです。[1 つのパッケージで両方の SDK](#one-package-both-sdks)を
参照してください。このページの内容はすべてディスクの窓口に沿って書いています（あなたやエージェントが
書くのはこちらです）。[同梱のプラグイン](#bundled-plugins)に、2 つの違いを書きました。Radio は
同梱の SDK 専用プラグインとして配られていて、既定では無効です。**Capabilities → Plugins** で
有効にすると、無料のライブ配信、局の検索、音に反応する波形付きの再生操作がステータスバーに出ます。
既存のプラグインの切り替えをそのまま使い、無効の間は何も足しません。参考になる実装例は、
別リポジトリの [`hermes-example-plugins`](https://github.com/NousResearch/hermes-example-plugins) にあります。

## 手早く試す — 最初のプラグイン {#quick-start-your-first-plugin}

`$HERMES_HOME/desktop-plugins/hello/plugin.js` を作ります（既定では `~/.hermes/...` です）。
デスクトップのプラグインはアプリ単位です。ウィンドウがつなぐプロファイル、ゲートウェイ、
遠隔のマシンがいくつあっても、置き場所は 1 か所だけです。フォルダー名はプラグインの `id` と
同じにしてください。

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

保存します。アプリは `desktop-plugins/` を見張っていて、数秒でファイルを読み込み、以後は保存の
たびにその場で入れ替えます。現れないときは ⌘K →
**Reload desktop plugins** を実行してください。読み込みに失敗すると、トーストがエラーを知らせます。
直してもう一度保存してください。

:::note JSX もビルドもありません
ディスク上のファイルは**コンパイルせずに**読み込まれるので、JSX の構文は解釈できません。UI は
`react/jsx-runtime` の `jsx()` / `jsxs()`（または `React.createElement`）で書いてください。
読み込める指定子は `@hermes/plugin-sdk`、`react`、
`react/jsx-runtime` の 3 つだけです。それ以外は意図的に解決に失敗します。
:::

## プラグインの取り決め {#the-plugin-contract}

プラグインは `HermesPlugin` を default export します。

```ts
interface HermesPlugin {
  /** Stable slug — becomes the `plugin:<id>` source and the id namespace. */
  id: string
  /** Human name for Settings / about UI. Defaults to `id`. */
  name?: string
  /** Registers on load when the user hasn't chosen (default true). Set false
   *  for opt-in plugins: they inventory in Capabilities ▸ Plugins, off until the
   *  user flips the switch. */
  defaultEnabled?: boolean
  /** Called once at load; wire contributions through `ctx`. */
  register: (ctx: PluginContext) => void
}
```

`register` は**プラグインごとに区切られた** `PluginContext` を受け取ります。登録簿を直接
触ることはありません。このコンテキストが出どころ（`source: 'plugin:<id>'`）を自動で付け、
すべてのコントリビューションの id に名前空間（`<id>:<localId>`）を付けるので、2 つのプラグインが
ぶつかることはありません。

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
  /** Gateway event stream by type (`'*'` = all). Tracked: removed on unload/reload/disable. */
  onEvent: (type: string, listener: (event: GatewayEvent) => void) => () => void
  /** Any other cleanup to run on unload/reload/disable (store subscriptions, injected DOM). */
  onDispose: (fn: () => void) => void
  /** Scoped timers and DOM listeners — cleared with the plugin. Each returns a disposer. */
  setTimeout: (fn: () => void, ms: number) => () => void
  setInterval: (fn: () => void, ms: number) => () => void
  addEventListener: (target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions | boolean) => () => void
  /** The curated OS door: native notification, open-external, reveal-in-file-manager, clipboard. */
  os: PluginOs
  /** Plugin-scoped JSON persistence (keys live under `hermes.plugin.<id>.`). */
  storage: PluginStorage
}
```

**コントリビューション**は、あらゆる面が共有する唯一の基本要素です。

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

どの領域かによって、`render`、`data`、またはその両方を渡します。

## コントリビューションの領域 — 実例集 {#contribution-areas-the-cookbook}

領域の定数は SDK から読み込みます。領域ごとに `data` の中身が違います。

| 面 | `area` | 渡すもの |
|---------|--------|-------------|
| レイアウトのペイン | `PANES_AREA`（`'panes'`） | `title` + `render` + `data: { placement, dock?, width?, height? }` |
| 全面のページ | `ROUTES_AREA` | `data: { path }` + `render` |
| サイドバーのナビ | `SIDEBAR_NAV_AREA` | `data: { path, label, codicon }` |
| ステータスバー | `STATUSBAR_AREAS.left` / `.right` | `render`（または `StatusbarItem` としての `data`） |
| タイトルバー | `TITLEBAR_AREAS.left` / `.center` / `.right` | `TitlebarTool` としての `data`、またはマウントに紐づく `<Contribute>` |
| ページの見出し | `WORKSPACE_PAGE_HEADER_AREA` | ページの中でマウントに紐づく `<Contribute>` を通した `render` |
| ⌘K のパレット | `PALETTE_AREA` | `data: PaletteContribution` |
| キー割り当て | `KEYBINDS_AREA` | `data: KeybindContribution` |
| テーマ | `THEMES_AREA` | `DesktopTheme` としての `data` |
| 入力欄まわり | `COMPOSER_AREAS.*` | 描画の差し込み口、またはミドルウェアと添付の提供元 |
| 外観の設定 | `APPEARANCE_AREAS.extra` | `render` — Settings → Appearance の末尾に足す操作 |

### ペイン {#panes}

ペインは、レイアウトの木構造に置かれる 1 枚のタイルです。`placement` はその役割を表すもので、
同じ役割の既存のペインとタブとして重なります。そのあと利用者は好きな場所へドラッグできます。

```javascript
ctx.register({
  id: 'pane',
  area: 'panes',
  title: 'my pane',
  data: { placement: 'right', width: '260px' },
  render: () => jsx(MyPane, {})
})
```

`placement` は `'main' | 'left' | 'right' | 'top' | 'bottom'` です。重ねるのではなく特定の
**端**に置きたい場合は、`dock` の指定を足します。ペインのドロップ用のつまみにドラッグするのと
同じことです。

```javascript
// Below the conversation, 200px tall.
data: {
  placement: 'bottom',
  dock: { pane: 'workspace', pos: 'bottom' },
  height: '200px'
}
```

`dock.pane` にはどのペインの id でも書けます（`workspace` が本体の会話です。ほかに `sessions`、
`terminal`、`files`、`review`、`logs` があります）。`dock.pos` は
`'top' | 'bottom' | 'left' | 'right' | 'center'` です。区画の半分を占めてしまわないように、
`width` か `height` を宣言してください。

あるプラグインが出している唯一のペインを閉じると、そのプラグインは無効になります。
**Capabilities → Plugins** から有効に戻せます。1 つのプラグインが複数のペインを出している場合、
1 つ閉じてもそのペインが消えるだけで、ほかのペイン、コマンド、ミドルウェアは動いたままです。
**Reset layout** を使うと、閉じたコントリビューションのペインが戻ります。

### ページとサイドバーのナビ {#pages-and-sidebar-nav}

ルートは、組み込みの画面と同じように、作業領域のペインに全面のページを表示します。たどり着けるように、
サイドバーのナビの行（やパレットのコマンド）と組み合わせてください。

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

`codicon` には [VS Code の codicon](https://microsoft.github.io/vscode-codicons/dist/codicon.html) の
id を書きます。どこからでも `host.navigate('/my-page')` でそのルートへ移動できます。

### ステータスバーとタイトルバー {#status-bar-and-title-bar}

ステータスバーの項目は、下のバーの左右どちらかの集まりに表示されます。いちばん簡単なのは
`render` 関数を渡すことです。ただのボタンでよければ、`StatusbarItem`
（`{ id, label?, icon?, detail?, variant?, menuItems?, … }`）としての `data` を使ってください。

```javascript

ctx.register({
  id: 'count',
  area: STATUSBAR_AREAS.right,
  order: 120,
  render: () => jsx(MyStatus, {})
})
```

タイトルバーの道具は、`TitlebarTool` の data（`{ id, label, icon, active?, onSelect? }`）として
`TITLEBAR_AREAS.left | .center | .right` に置きます。

タイトルバーの差し込み口は**恒久的なマウント先**です。そこに登録したコンポーネントは、利用者が
チャットと全面のページ（Capabilities、Messaging、Artifacts、追加したルート）を行き来する間も
マウントされたままです。そのため、全体に副作用を及ぼす `useEffect`（`<style>` タグの差し込み、
`html[data-*]` の属性、`MutationObserver`）は、登録ごとに 1 回だけ準備が走り、破棄のときに
1 回だけ後片付けが走ります。画面移動の途中で走ることはありません。

1 つのページだけのもの（かんばんのボード切り替えなど）は、代わりに
`WORKSPACE_PAGE_HEADER_AREA` に置いてください。そのページが画面にある間だけ、作業領域のパネルの
タブの見出しの行に描画され、それ以外のときは空になります。ページと一緒に消えるように、
マウントに紐づく `<Contribute>`（後述）で登録してください。

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

キー割り当ては設定画面で利用者が変えられます。`defaults` は最初の割り当てにすぎません。

### テーマ {#themes}

テーマのコントリビューションは、完全な `DesktopTheme` を `data` として渡します（名前、表示名、
色など）。組み込みのものと同じようにテーマの選択画面に現れます。

```javascript

ctx.register({ id: 'noir', area: THEMES_AREA, data: myDesktopTheme })
```

テーマを登録すると一覧に載りますが、選ばれるわけではありません。`useTheme()` は、コンポーネントの
中から今の見た目を読み（`theme`、`themeName`、`availableThemes`、`resolvedMode`）、変更します
（`setTheme`、`setMode`、`previewTheme`）。

```javascript

function ThemePicker() {
  const { availableThemes, setTheme, themeName } = useTheme()

  return availableThemes.map(t => (
    <Button key={t.name} disabled={t.name === themeName} onClick={() => setTheme(t.name)}>
      {t.label}
    </Button>
  ))
}
```

描画以外のきっかけで切り替える場合 — ゲートウェイの接続、ソケットのイベント、`host.onEvent` の
コールバックなど — フックを掛けるコンポーネントがありません。そこでは `requestTheme(name)` を
使ってください。解決できない名前は、既定の見た目に置き換えられるのではなく拒否されます。そのため
戻り値がそのまま「入っているかどうか」の確認になり、名前を間違えても誰かの見た目を黙って
リセットしてしまうことはありません。

```javascript

host.onEvent('gateway.ready', () => {
  if (!requestTheme('noir')) {
    host.notifyError('Connected, but the noir theme is not installed.')
  }
})
```

どちらの窓口もプロファイルごとに保存されるので、プラグインからの切り替えも手で選んだときと
まったく同じように残ります。テーマを差し替えるのではなく*今の*テーマに色味を足したいときは、
`setAccentOverride(hex)` を使い、`ctx.onDispose` で解除してください。単体で配られている
[Accent Picker](https://github.com/NousResearch/hermes-desktop-accent-picker) の
プラグインが、その実例です（そのままインストールできる完成したディスク型のプラグインでもあります）。

### 入力欄の拡張 {#composer-extensions}

`COMPOSER_AREAS`（`top`、`bottom`、`underside`、`leading`、`actions`、
`attachments`、`middleware`）を使うと、メッセージの入力欄のまわりに操作を足したり、添付の提供元を
用意したり、送信前に下書きを加工したり（`handler(draft) => draft | null` を持つ
`ComposerMiddleware`）できます。`top` は入力の上の帯、`bottom` は入力の格子の下の行で、どちらも
入力欄の枠の内側にあります。`underside` は入力欄全体の**下**に浮かぶ帯で、自前の枠を持ちません。
入力の枠の外に置きたい提案のピルや状態の案内の置き場所です（next-prompt のプラグインは、
「next prompt」のピルをここに描画しています）。

### 入力欄の下書き API — 今の入力を読み書きする {#composer-draft-api-read-and-write-the-live-input}

入力欄の領域ではできないこと — 入力欄に文字を**入れる**、中身を置き換える、今の下書きを読む、
送信する — には、`host.composer` を使ってください。これが正式な窓口です。ProseMirror の DOM に
手を伸ばしたり、`[data-composer-target]` で探したり、合成した `InputEvent` を流したりするのは
プラグインの範囲の外で（カタログの規則 8）、アプリのマークアップが変わった瞬間に壊れます。
宛先の指定は次のとおりです。`null` は利用者が今入力している入力欄、セッションの id（保存された
ものでも実行時のものでも）は、主となるペインかタイルにあるそのセッションの入力欄、`'new'` は
まだセッションの id を持たない新しい下書きです。

```javascript

// Append to the active composer (modes: 'block' | 'inline' | 'prefix';
// 'prefix' seats a slash command at the start). Acknowledged like setDraft:
// true when a mounted surface applied the text, false when the text is blank
// or no live surface answers for the address.
const inserted = await host.composer.insertText(null, 'draft note', { mode: 'inline' })

// Replace a session's whole draft — '@'-ref and '/command' tokens hydrate
// into chips exactly like an official paste. False when no mounted surface
// answers (an unmounted session is never half-written).
const ok = await host.composer.setDraft('sess-1', 'plan:\n- @file:src/app.ts')

// Read the live draft: the mounted surface's in-DOM text (unsaved keystrokes
// included), falling back to the debounced persisted stash. Null when nothing
// holds it.
const text = await host.composer.getDraft('sess-1')

// Send as if the user typed + pressed Enter. Fail-closed like the app's own
// panels: no visible surface for the address → false, never a broadcast.
const sent = host.composer.submit('sess-1', 'ship it')

// Put the caret in a composer (same addressing). insertText/setDraft already
// focus a visible surface they paint; use this to return the caret after a
// plugin popover closes or from a "go to input" keybind.
host.composer.focus(null)
```

```ts
host.composer: {
  getDraft(sessionId: string | null): Promise<string | null>
  setDraft(sessionId: string | null, text: string): Promise<boolean>
  insertText(sessionId: string | null, text: string, opts?: { mode?: 'block' | 'inline' | 'prefix' }): Promise<boolean>
  submit(sessionId: string | null, text: string): boolean
  focus(sessionId: string | null): void
}
```

**調停。** どの動詞も、宛先について安全側に閉じます。要求に応えるのは、そのセッションを
受け持つマウント済みの入力欄（そのタイル、またはそのセッションを表示している主となるペイン）
だけです。`null` に応えるのは、アプリのフォーカスの経路が今向いている面だけです。`'new'` に
応えるのは、セッションを表示していない間の主となるペインだけで、今入力中の入力欄へ流れることは
ありません。ぴったり合う面が無ければ `null` / `false` を返し、
たまたまマウントされているペインへばらまくことはしません。書き込みはアプリ自身の描画の経路を
通るので、`@` の参照や `/` のコマンドの記法はチップとして組み立てられ、結果は利用者が
貼り付けたときとバイト単位で同じになります。これらは入力と同じ権限を持つ、利用者が起こす
1 回ごとの操作です。そのあと下書きを「持つ」プラグインはいないので、無効にしたときに
**後片付けするものはありません**。入力欄のまわりにずっと居続けたいプラグインは、代わりに
`COMPOSER_AREAS` の差し込み口を使ってください。

複数のセッションを扱うプラグインは、セッションごとの状態（自分のパネルがどのセッションを
編集しているか）を自分の側で持ち、その id をここに渡します。1 つのプラグインの書き込みが
別のセッションの入力欄に入ってしまうことはないと、この経路が保証します。

**DOM への手出しからの移行**（この API を作るきっかけになった、保留中のカタログのプラグイン）:

| プラグイン | 以前 | 今 |
|---|---|---|
| next-prompt (#120660) | `window.dispatchEvent(new CustomEvent('hermes:composer-insert', …))` と、`setTimeout` での `hermes:composer-focus`。見えている対象を探す `[data-composer-target]`/`[data-pane-hidden]` の走査 | `await host.composer.insertText(null, suggestion.text, { mode: 'block' })`。ピルがカーソルを奪った場合は続けて `host.composer.focus(null)` |
| prompt-snippets (#116030) | 同じ `hermes:composer-insert` のイベント。`[data-slot="composer-input"]`/ProseMirror の `textContent` と、合成した `InputEvent` による代替。`surfaceEditorEl().focus()` | `host.composer.insertText(sid, text, { mode: 'block' })`。代替は `setDraft(sid, (await getDraft(sid) ?? '') + '\n' + text)` に置き換え、`host.composer.focus(sid)` — `sid = host.state.focusedSessionId.get()` |
| prompt-enhancer (#116031) | エディターの子ノードをたどって文字列にし、チップの DOM を組み直して、`replaceChildren` と合成した `InputEvent` | `const draft = await host.composer.getDraft(sid)` → 加工 → `await host.composer.setDraft(sid, enhanced)`（チップはアプリ側で組み立てられます）。元に戻すのも `setDraft` をもう一度 |
| memory-review (#115966) | `/memory …` に `host.request('slash.exec', { session_id, command })` — すでに SDK だけで完結 | 任意: 実行する代わりに `host.composer.insertText(sid, '/memory pending', { mode: 'prefix' })` でコマンドを利用者のために置いておく |
| intelligent-tool-break (#115964) | 「Message」ボタンは「type /break」とトーストを出すだけ（入力欄には書かない） | `host.composer.setDraft(host.state.focusedSessionId.get(), '/break ')` のあと `host.composer.focus(null)` で、本来意図した動きに戻る |

表の `sessionId` は、プラグインの UI が紐づいているセッションの id です。入力欄の差し込み口の
描画では `host.state.focusedSessionId.get()` です。

### セッションの行 — 装飾とセッション一覧の API {#session-rows-decorations-the-session-list-api}

`SESSION_ROW_AREAS`（`leading`、`trailing`）を使うと、サイドバーのセッションの行を飾れます。
`render({ sessionId })` を持つ `data` のコントリビューションを登録し、小さな要素（バッジ、
色見本、タグ）か、自分が受け持たない行には `null` を返します。登録しても、ほかの行には何の
負担もかかりません。

```ts

ctx.register({
  area: SESSION_ROW_AREAS.trailing,
  id: 'my-tag',
  data: {
    render: ({ sessionId }) => (owned.has(sessionId) ? <span className="my-tag">★</span> : null)
  } satisfies SessionRowSlotContribution
})
```

これをセッション一覧の API と組み合わせてください。アプリ自身の操作と同じ保存先に書くので、
プラグインの操作と手でのクリックが食い違うことはありません。

```ts
host.sessions.pin(storedSessionId: string, pinned?: boolean, index?: number): void
host.sessions.reorder(storedSessionIds: string[]): void   // Recents; [] = clear manual order → default sort
host.sessions.reorderPinned(storedSessionIds: string[]): void  // Pinned section; omitted pins keep their slot
host.sessions.setColor(storedSessionId: string, color: string | null): void
```

id は**保存された**セッションの id です。実行時の id は、長く残る系譜の根に解決されるので、
ピン留めや色は圧縮による id の入れ替わりを越えて残ります。行の装飾の差し込み口も、描画に
渡すのは同じ長く残る id（`_lineage_root_id ?? id`）で、実行時の id ではありません。解決には、
このウィンドウが読み込んだ行を使います。読み込んだどの行にも合わない id はそのまま書かれるので、
一覧から外れてスクロールしたかもしれないセッションには、（覚えておいた実行時の id ではなく）
差し込み口の長く残る id を渡してください。`reorder` も同じ id を受け取り、内部でそれぞれを行の
実行時の id に対応付けます。Recents の並び順の保存先は、ドラッグの経路と同じく実行時の id を
キーにしているためです。`pin(id, true, index)` は、Pinned の一覧のその位置にピンを差し込みます
（2 つのピンの間へのドロップにあたります）。`index` が無ければ、行の ⇧-クリックと同じく末尾に
足します。

**調停。** これらの動詞は、利用者のデータを利用者の操作として 1 回ずつ書き換えるものです。
利用者がクリックしたときとまったく同じく最後の書き込みが勝ち、そのあと結果を持つプラグインは
いません。差し込み口のコントリビューションは**すべて**マウントされます（先勝ちではなく登録順）。
それぞれが自分のエラー境界の中にあるので、ある行で例外を投げたり `null` を返したりした
プラグインが、ほかのプラグインのその行の装飾を消すことはできず、1 つの行に 2 つの装飾があれば
横に並んで表示されます。行のレイアウト、操作、題名は中核が持ち続けます。差し込み口は足すだけで、
置き換えはしません。

**後片付け。** 動詞には要りません。差し込み口のコントリビューションは、`ctx.register` の
破棄用の関数で取り除かれます（無効にしたり読み込み直したりすると外れ、行は装飾なしで
描き直されます）。

保留中のカタログのプラグインの移行:

- **drag-to-pin-session** — `onTogglePin` / `onReorderSessions` / `session._lineage_root_id`
  を得るための `__reactFiber$*` の走査を、行の差し込み口の id に置き換えます
  （`SESSION_ROW_AREAS.leading` の下の `render: ({ sessionId }) => …` で、行ごとの長く残る id が
  手に入ります）。そのうえで、Pinned の区画へのドロップには `host.sessions.pin(sessionId, true, dropIndex)`、
  Recents へ戻すドロップには `host.sessions.pin(sessionId, false)`、Pinned の区画の中での
  ドラッグには `host.sessions.reorderPinned(ids)`、「手動の並び順をリセット」の経路には
  `host.sessions.reorder([])` を使います。
- **better-session-appearance** — `localStorage` の
  `hermes.desktop.sessionColors` への書き込みと、fiber から拾った `onChange` を
  `host.sessions.setColor(sessionId, hex)` に置き換え（`null` で解除）、行の状態の点を書き換える
  代わりに、行ごとの記号を `SESSION_ROW_AREAS.leading` から描画します（`_lineage_root_id` から
  得ていた長く残る id は、差し込み口の `sessionId` です）。

`COMPOSER_AREAS.modelPill` は、モデルのピルの**表示名**を上書きします。提供元
（`{ label: (ctx: ComposerModelPillContext) => string | null }`）は
`{ model, reasoningEffort, compact }` を受け取り、表示する文字列を返すか、`null` を返して次の
提供元（最後は中核の表示名）に譲ります。ピルの枠、ピン留めの点、メニューはそのままで、変わるのは
表示名だけです。今のプラグインがしている MutationObserver での文字の書き換えに代わる、
正式な方法です。

#### モデルのピルの表示名の提供元 {#model-pill-label-providers}

```ts

interface ComposerModelPillContext {
  model: string            // the model slug the pill would show
  reasoningEffort: string  // the session's live effort level, '' when the model has none
  compact: boolean         // floating-composer mode: chevron only, providers are NOT consulted
}
interface ComposerModelPillProvider {
  label: (ctx: ComposerModelPillContext) => string | null
}

ctx.register({
  area: COMPOSER_AREAS.modelPill,
  id: 'my-label',
  data: { label: ({ model, reasoningEffort }) => reasoningEffort ? `${model} · ${reasoningEffort}` : null } satisfies ComposerModelPillProvider
})
```

**調停。** 提供元は登録簿の順に問い合わせられ、*最初の空でない文字列が勝ちます*。それより
あとの提供元は呼ばれません。それ以外の値はすべて辞退とみなされ、次の提供元に問い合わせます。
`null`、`''`、空白だけの文字列、そして文字列でない値（表示名はそのまま JSX に入るので、
オブジェクト、配列、数値は決して描画されません）です。**例外を投げた**提供元も辞退と同じ扱いで、
エラーは握りつぶされ、ピルは次の提供元、最後は中核の表示名へ進みます。そのため壊れた
プラグインがピルを空白にしてしまうことはありません。`reasoningEffort` は常に `string` です
（モデルに推論の強さが無いときは `''` で、`undefined` にはなりません）。compact（浮かぶ入力欄）の
表示では、ピルは山形の印だけを描き、どの提供元も呼ばれません。`label()` が評価し直されるのは、
登録簿、モデル、推論の強さ、compact のフラグのどれかが変わったときだけです。

**後片付け。** 提供元は普通のデータのコントリビューションです。`ctx.register` が破棄用の関数を
返し、プラグインが無効にされたり読み込み直されたりすると読み込む側が取り除き、その時点で中核の
表示名に戻ります。`ctx.onDispose` で元に戻すものはありません。

**compact-reasoning-label の移行。** このプラグインは以前、
`[data-slot="composer-root"] button span.truncate` でピルを探し、`span.textContent` から
末尾の推論の強さを表す語を正規表現で取り除き、その処理を body 全体の
`MutationObserver` と 1 秒ごとの `setInterval` で繰り返していました。今のビルドでは中核の表示名に
推論の強さの語はもう含まれない（強さには専用の `ReasoningPill` があります）ので、取り除く処理は
何もしません。正式な形は、描画された文字を編集するのではなく、コンテキストから表示名を計算する
ことです。

```js
register(ctx) {
  ctx.register({
    area: COMPOSER_AREAS.modelPill,
    id: 'compact-reasoning-label',
    // Decline (null) whenever there is nothing to change so the core label wins.
    data: { label: ({ model }) => shorten(model) ?? null }
  })
  // No MutationObserver, no setInterval, no injected <style>: the contribution is
  // disposed with the plugin.
}
```

このプラグインが差し込んでいた、推論のピルの表示を切り替える CSS には対応するフックがありません。
それが要るのは、アプリが狭い幅でその表示名を隠すようになった場合だけです。

### 外観の設定 {#appearance-settings}

`APPEARANCE_AREAS.extra` は、コントリビューションを **Settings →
Appearance** の末尾、組み込みの区画のあとに描画します。これまでそのページに要素を差し込んだり、
React の内部を通してその部品を動かしたりしていたプラグインのための
継ぎ目です。

```ts
APPEARANCE_AREAS = { extra: 'appearance.extra' } as const

ctx.register({
  area: APPEARANCE_AREAS.extra,
  id: 'session-colour-rules',          // unique within your plugin
  render: () => <MyAppearanceCard />   // any React tree; SDK hooks allowed
})
```

*調停:* 登録はすべて、登録簿の順に、それぞれ自分のエラー境界の中でマウントされます。例外を
投げたコントリビューションは、その `id` を示すインラインのエラーカード（Retry 付き）に畳まれ、
ページのほかの部分（とほかのプラグインのカード）は描画を続けます。この差し込み口がマウントされる
のは Appearance の最上位のページだけで、ディープリンクの下位ページ
（`settings/appearance/<section>`）には出ません。また「先勝ち」は無いので、ここでプラグイン同士が
互いを消すことはできません。

*後片付け:* 登録はプラグインを読み込む側が持っています。プラグインを無効にしたり読み込み直したり
すると破棄され、次の描画でカードが消えます。アプリ側には何も残らないので、`ctx.onDispose` で
片付けるものはありません。

色を選ぶには、アプリ自身の色見本の格子を使ってください。`ColorSwatches`（すでに SDK から
公開されています）は、プロファイルのレールやプロジェクトのダイアログが描くものとまったく同じものを、
自分の `onChange` 付きで描画します。`PROFILE_SWATCHES` を渡し、セッションの色には
`host.sessions.setColor(id, color)` と組み合わせてください。

この差し込み口を作るきっかけになったプラグインの移行:

* **better-session-appearance** — Appearance のサブメニューの `{ onChange, swatches }` を拾う
  fiber の走査と、アプリのドロップダウンへの `clearBtn.after(...)` /
  `host.appendChild(panel)` による差し込みを、1 つの
  `ctx.register({ area: APPEARANCE_AREAS.extra, id: 'rules', render })` に置き換えます。その
  カードが `<ColorSwatches swatches={PROFILE_SWATCHES} value onChange />` と、太字・記号・自動規則の
  操作を描画します。`data-better-session-appearance` の属性の書き込みと、ドロップダウンの
  `max-height` の上書きはやめます。
* **hermes-appearance-hub** — 紙の質感・フォント・導入の文言の操作を、Settings に手を伸ばす
  ステータスバーのメニューではなく、`APPEARANCE_AREAS.extra` のカードとしてマウントします。設定の
  *値*は、これまでどおり `host.settings`（許可された一覧のキー）と `THEMES_AREA` を通します。

### 外部の内容を埋め込む {#embedding-external-content}

外部のウェブの内容（読み物の表示、ダッシュボード、ドキュメント）には、SDK の
`<SandboxedFrame src title />` を使ってください。アプリの外部の内容向けの構えを持った、
サンドボックスの iframe を描画します。生成元は不透明で、既定で `allow-scripts`、`no-referrer`、
遅延読み込みです。素の Electron の `<webview>` は決してマウントしないでください。アプリの
`persist:` のプレビュー用の区画に入り、アプリの cookie や保存領域を共有してしまいます。

```ts
interface SandboxedFrameProps {
  src: string      // absolute http(s): or data: URL; any other scheme renders nothing (console.warn)
  title: string    // required — an untitled frame is unlabelled in the a11y tree
  sandbox?: string // extra tokens; filtered through the allowlist below
  className?: string; style?: CSSProperties
  onLoad?, onError?: ReactEventHandler<HTMLIFrameElement>
  ref?: Ref<HTMLIFrameElement>
}
```

props は明示的な許可の一覧で、`ComponentProps<'iframe'>` ではありません。`allow`
（Permissions-Policy の委譲 — アプリが持つマイクやカメラの許可を第三者のサイトに渡してしまいます）、
`srcdoc`、`name`、`allowFullScreen`、`csp`、
`credentialless` をはじめ、iframe のほかの属性はどれも props ではなく、要素に展開されるものも
ないので、型を無理に変えても DOM には届きません。

*調停（禁止の一覧ではなく許可の一覧）:* 呼び出し側が足せるトークンは
`allow-scripts`、`allow-forms`、`allow-downloads`、`allow-pointer-lock`、
`allow-orientation-lock`、`allow-presentation` だけです。それ以外 —
`allow-same-origin`、`allow-top-navigation*`、`allow-popups*`、`allow-modals`、
`allow-storage-access-by-user-activation`、そしてこの部品が知らないトークン — は、渡しても
大文字小文字を問わず取り除かれます。空になった場合は既定の構え（`allow-scripts`）に戻ります。
`sandbox` の属性が**まったく無い**枠は、完全な権限を持ってしまうからです。`loading="lazy"` と
`referrerPolicy="no-referrer"` は props ではありません。不透明な生成元こそが
封じ込めです。外部の内容は、アプリにも、その保存領域にも、preload の橋渡しにも
手が届きません。

*後片付け:* ただの React の要素です。ペインやページをアンマウントすれば、枠とその実行環境が
消えます。アプリ側には何も登録されません。

**rss-reader** (#115972) の移行: 仮置きの `/preview` → 501 →
`host.openWorkspace('rss-browser')` → 空の `RssBrowserFrame` → `ctx.os.openExternal`
という連鎖を、作業領域のページの中の `<SandboxedFrame src={article.url} title={article.title} />` に
置き換えます。残っている `.rss-browser-frame-host webview` の CSS は消してください。

### 会話の中の指示子 — モデルが呼び出すインラインのコンポーネント {#transcript-directives-inline-components-the-model-addresses}

`TRANSCRIPT_DIRECTIVE_AREA` は、会話そのものをコントリビューションの領域にします。名前を付けた
指示子を登録すると、エージェントが `::name{key="value"}` という形の段落を出すことで、アシスタントの
メッセージの中に自作のコンポーネントを表示できます。

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

この面を安全に保つために、ホストが守らせている決まりがあります。

- 指示子は**段落まるごと**でなければなりません。文の途中の `::name` はただの文章のままなので、
  プラグインのコンポーネントが本文を乗っ取ることはありません。
- 属性は**信用できないモデルの出力**です（`key="value"` の組で、文字列だけ）。
  自分のフィールドは自分で検証し、おかしな値のときは推測せずに何も描かないでください。
- 誰も**引き受けていない**指示子（その名前のプラグインが登録されていない場合）は、これまでどおり
  ただの段落として表示されます。プラグインが無効でも何も壊れません。
- 描画はコントリビューションのエラー境界に包まれています。例外が出てもインラインのエラー表示に
  なるだけで、メッセージが死ぬことはありません。
- 名前がぶつかった場合は先に登録したほうが勝ちます。攻めた名前には自分のスラッグで名前空間を
  付けてください（`board` ではなく `myplugin-board`）。

中核部分は参考例として指示子を 1 つ同梱しています。`::preview{file="…"}` は、作業領域の HTML
ファイルを**メッセージの中でそのまま**表示します。中身は、生成元を持たないサンドボックスの
`srcdoc` の iframe です（スクリプトは動き、部品は完全に操作できますが、アプリやその保存領域、
橋渡しの仕組みには手が届きません）。枠は中身に合わせて大きさを変え（高さは随時、幅は中身の
自然な広がりに合わせ、メッセージの流れの中で左端に揃います）、テーマの前置きが、アプリで解決済みの
色の値（`--foreground`、`--muted-foreground`、
`--accent`、`--border`、`--card`）、アプリのフォント、透明な背景を文書に渡します。そのため部品の
ような HTML は最初から馴染んで見え、丸ごとのページは自分のデザインを保ちます。HTML 以外の対象と
遠隔のゲートウェイでは、従来のプレビューのカードに戻ります。自作の指示子はスキルの中で
エージェントに教えてください（それが出し方を覚える経路です）。

プレビューした部品は**返事もできます**。枠の中で
`window.hermes.send('get-price eth')` を呼ぶ（あるいは宣言的に
`<button data-hermes-send="get-price eth">` と書く。スクリプトは要りません）と、そのプロンプトが
利用者のターンとして画面の外でエージェントへ渡ります。会話に吹き出しは増えず、部品が更新される
ことが目に見える返事になります。それでもターンは本物です。エージェントを起こし、入力欄の
割り込みや順番待ちの決まりに従い、（`hidden` の型で）保存されるので、再開時もセッションの DB にも
記録がすべて残ります。プロンプトは前後が削られ、500 文字までに切られ、1 つの枠につき毎秒 1 回に
絞られます。

### マウントに紐づく装飾（`Contribute`） {#mount-scoped-chrome-contribute}

`ctx.register` は**恒久的な**コントリビューション向けです。すでに画面にあるコンポーネントと
生死をともにすべき装飾なら（ページ専用の見出しの操作は、そのページが外れれば消えるべきです）、
代わりにその中で `<Contribute>` を描画してください。

```javascript

jsx(Contribute, {
  area: WORKSPACE_PAGE_HEADER_AREA,
  id: 'my-page:switcher', // namespace with your slug
  children: jsx(MySwitcher, {})
})
```

マウントで登録され、アンマウントで自動的に破棄されます。

### サイドバーのナビの表示と並び順（`SIDEBAR_NAV_PREFS_AREA`） {#sidebar-nav-visibility-and-order-sidebarnavprefsarea}

プラグインがサイドバーの上部のナビの行を隠したり並べ替えたりするときは、設定を書き込むのでは
なく、**好みをコントリビューションとして出します**。中核は描画のときにすべての `sidebarNav.prefs`
のコントリビューションをまとめ、その結果を、本来表示する行に当てはめます。既定の一覧そのものは
変わりません。

```ts

// Payload (`data`) of a sidebarNav.prefs contribution
interface SidebarNavPrefsContribution {
  hide?: string[]   // rows to drop
  order?: string[]  // rows to place first, in this order
}

ctx.register({
  id: 'prefs',
  area: SIDEBAR_NAV_PREFS_AREA,
  data: { hide: ['cron'], order: ['capabilities', 'new-session'] } satisfies SidebarNavPrefsContribution
})
```

ナビの id は、それぞれの行自身の id です。中核の行は `new-session`、`capabilities`、
`messaging`、`artifacts`、`cron` です（`SidebarNavId` の型。`artifacts` と
`cron` は Advanced モードでだけ表示されます）。プラグインが足した行の id は、その
**登録した** `SIDEBAR_NAV_AREA` の id で、`ctx.register` が
`${pluginId}:${id}` の名前空間を付けます。`kanban` というプラグインが `{ id: 'kanban-nav', area:
SIDEBAR_NAV_AREA }` を登録したなら、その行は `hide`/`order` の中で `'kanban:kanban-nav'` と
呼びます。

**調停。** 隠される行は、すべてのコントリビューションの `hide` の**和集合**です（ほかの
プラグインが隠した行をあるプラグインが表示し直すことはできず、隠すほうが並び順より優先されます）。
ただし `capabilities` は例外です。Plugins のタブがあるこの行は、利用者がプラグイン自身の
無効化スイッチにたどり着く経路なので、動かすことはできても隠すことはできません。コントリビューションは
登録簿の領域の順 — **`order` の小さい順、次に登録順** — に当てはめられ、最初のものの `order` が
勝ちます。あとのコントリビューションは、まだ置かれていない id だけを置き、どの order にも名前の
無い行は、名前のある行のあとに既定の相対的な順で並びます。知らない id は何もしません。

**後片付け。** コントリビューションは登録簿の中にあるので、プラグインを無効にしたり読み込み直したり
すると破棄され、行はすぐに戻ります。消すものはありません。これが `host.sidebar.hide()` という
動詞になっていない理由です。`host` は 1 つしかないので書き込みの主を特定できず、保存された好みは
プラグインより長生きしてしまい、2 つのプラグインが互いの並び順を上書きし合うことになります。

**利用者の選択を保存する**のは、プラグインが自分の `ctx.storage` で行う仕事です。`register` で
保存した好みを読んでコントリビューションとして出し、編集のたびに、保存し、破棄し、出し直します
（同じ `id` で登録し直すと置き換わります）。

```ts
// sidebar-manager: replaces `[data-sbm-off] { display:none }` + re-parenting <li>s
let dispose = () => {}
const apply = (prefs: SidebarNavPrefsContribution) => {
  dispose()
  dispose = ctx.register({ id: 'prefs', area: SIDEBAR_NAV_PREFS_AREA, data: prefs })
}
apply(ctx.storage.get('navPrefs', {}))
// in the editor's onChange:
ctx.storage.set('navPrefs', next); apply(next)
```

セッションの区画（Pinned、Recents、Cron jobs）は対象外で、ナビの行だけに効きます。

## ホストの API {#host-api}

`host` にあるものは、プラグインのどこからでも使えます。状態の atom は読み取り専用です。
処理の中では `.get()` で読み、コンポーネントでは `useValue(atom)` で購読してください。

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

`host.state.gateway` は WebSocket の接続のことで、チャットのターンが動いているかどうかでは
ありません。ソケットが `open` のままターンの途中ということもありますし、同時に別のセッションが
待機中ということもあります。入力欄やプラグインの操作を無効にするときは、**今見ているセッションの**
ターンの進行中（`host.state.busyBySession[sessionId]`、またはそのセッションの `view.$busy`）を
見てください。`gateway` を使ってはいけませんし、プロセス全体の進行中フラグも使ってはいけません。

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
host.onEvent(type, fn)                     // gateway event stream ('*' = all); returns disposer.
                                           //   Calls made during register() are retired with the
                                           //   plugin; elsewhere prefer ctx.onEvent (always tracked)
host.logs(...)                             // tail an app log file
host.status()                              // one-shot system status snapshot
host.restartGateway()                      // restart the backend gateway
host.profileRoutes()                       // [{ profile, targetProfile, connectionId, mode }]
host.requestProfile<T>(route, method, params?, timeoutMs?, { spawnPriority? })   // registry-routed RPC; no foreground swap
host.requestProfile<T>(profile, method, params?) // legacy v1/local overload
host.request<T>(method, params?)           // active-gateway JSON-RPC — the real power
host.sessions.pin(storedSessionId, pinned?, index?)  // pin/unpin (default pinned=true); index = slot in Pinned;
                                           //   same store the row's ⇧-click / drop writes
host.sessions.reorder(ids)                 // replace the manual Recents order (what a drag persists); [] resets
host.sessions.reorderPinned(ids)           // permute the Pinned section (the pinned drag path)
host.sessions.setColor(storedSessionId, color | null)  // per-session colour override; null clears
host.skills.list(profile?)                 // every skill for the scope (Capabilities endpoints)
host.skills.setEnabled(name, on, profile?)  // enable/disable a skill — the Capabilities toggle
host.toolsets.list(profile?)               // toolsets + enabled state
host.toolsets.setEnabled(name, on, profile?)// enable/disable a toolset
host.profiles.list(scope?: ProfileScope)   // the profile list the profile rail reads
host.pluginDecisions                       // READ-ONLY atom: this window's plugin on/off decisions (frozen copies)
```

`host.request` は、アプリ自身が使っているのと同じ JSON-RPC です（セッション、設定、スキル、
cron、かんばんなど）。`host.requestProfile` は `host.profileRoutes()` が返す記述子を受け取り、
今のチャットやゲートウェイを変えずに、その記述子が指す登録元とプロファイルへ RPC を流します。
プロファイル名だけを渡す形は、単一のローカル環境や従来の構成のために残してあるだけです。登録簿を
意識するプラグインは記述子を渡して、同じプロファイル名を出す 2 つの登録元がぶつからないように
してください。

プールされたプロファイルのバックエンドを冷えた状態から起こす可能性のある呼び出しは、既定では
バックグラウンドの優先度でつなぎに行きます。バックグラウンドの接続は、ユーザーの操作のために
プールが空けておく枠を決して使えません。呼び出しがユーザーの操作そのもの（保存、ボタンの押下、
ダイアログを開く）であるときは、
`host.requestProfile(route, method, params, undefined, { spawnPriority: 'foreground' })` を渡してください。
そうしないと、温まったバックエンドでプールが埋まっているとき、枠が空くのを 30 秒のタイムアウトまで
待ったうえで失敗します。定期的な問い合わせや、一覧を温めておく処理には、既定のバックグラウンドを使ってください。

`host.openWorkspace(id, { render, title?, minWidth?, onClose? })` は、プラグインが描いた画面を
**作業領域の中心**（セッションのタイルやプレビューが使うのと同じ中央の場所）にタブとして
差し込み、前面に出します。同じ `id` でもう一度呼ぶと、二重に開かずに中身をその場で更新して
タブを前に戻します。タブを閉じると（タブの閉じるボタンか ⌘W）、登録が解かれて `onClose` が
呼ばれます。戻ってくる破棄用の関数を使えば、プログラムから閉じられます。古いデスクトップの
ビルドに備えて、この機能の有無を確かめ（`typeof host.openWorkspace ===
'function'`）、無ければ通常のペインに落としてください。Bot Mode のグループチャットの部屋が
参考例です（使えるならメインウィンドウを占有し、そうでなければパネル内の表示にします）。

`host.paneVisibility(paneId)` は、そのコントリビューションのペインが実際に画面に出ている間だけ
`true` になる、読み取り専用の反応する atom を返します。つまり、レイアウトの木構造にあり、
閉じられても隠されてもおらず、その区画が最小化されておらず、その区画の表に出ているタブを
占めている状態です（区画に 1 つしかないペインもこれに当たります）。id は
コントリビューションの範囲でのペインの id、つまり `<pluginId>:<paneId>` です。atom は id ごとに
記憶されるので、描画の中で呼んでも問題ありません。ペインが見えている間だけ関連する UI を登録する、
といった使い方ができます。Bot Mode の Cronjobs のペインが参考例で、Bots のペインがサイドバーの
タブを取っている間だけ登録し、利用者が Sessions に戻ると登録を解きます。古いデスクトップでは
機能の有無を確かめ（`typeof host.paneVisibility === 'function'`）、無ければ常に登録したままの
挙動に落としてください。

`host.profileRoutes()` は、今の接続の登録簿にあるすべての登録元を列挙します。必要になってから
つなぐ SSH の登録元は、トンネルを開かずに資格情報の要らない `default` の種となる経路を出すので、
プラグインが最初にそこへつなぐ側になれます。SSH の `remoteProfile` は、その経路のバックエンドの
`targetProfile` のままです。`connectionId` は登録簿での経路の識別子で、
キーや保存には `profile` と組み合わせて使ってください。エンドポイント、トークン、SSH のホストや鍵、
そのほかの生の接続情報が、プラグインの IPC の境界を越えることはありません。`profile` は
リクエストに使う、その登録元の中での経路です。`targetProfile` は、その経路が受け持つバックエンドの
Hermes のプロファイルです。経路が別のバックエンドのプロファイルに明示的に対応付けられている場合
（たとえば SSH の `remoteProfile` の上書きや、従来のプロファイルごとの URL の別名）に、両者は
異なります。この区別によって、接続の秘密を出さずにバックエンドの素性を保てます。

プロファイルを扱うプラグイン向けには、専用のメソッドもあります。
`profiles.list`（各プロファイルと、その直近の会話を `last_session` として返します。
`include_sessions: false` を渡すとプロファイルごとの DB の問い合わせを省けます。
`preferred_session_ids: { profileName: sessionId }` を渡すと、プロファイルごとに固定した
1 つのセッションを、存在を確かめたうえで正確に引けます。名指しした行には
`preferred_session` の要約が付き、隠れた行や圧縮の系譜は今の先端まで解決されます。
その id が完全に無くなっている場合は `null` です。古いゲートウェイはこのパラメーターを
無視してこのフィールドを省きます）
と `profiles.create`（`name`、`description`、`clone_from`、
`clone_all`、`no_skills`、`soul`、任意の `model` と `provider` の固定）です。これらは
ダッシュボードの `/api/profiles` の REST の経路の、WebSocket 版の双子です。
`host.state.busy` は、今見ているチャットのターンが進行中か（考え中と出力中）を表します。
`host.state.awaitingResponse` は、送信からアシスタントの最初の応答が来るまで真のままです。
どちらも、利用者が実際に見ているチャットに追随します。焦点のあるセッションのタイルがあれば
それ、無ければ作業領域の主となるチャットです（ステータスバーの進行中の脈打つ表示が読むのと
同じ信号です）。コンポーネントの中ではこう購読します。

```javascript
const busy = useValue(host.state.busy)
```

トークン単位の細かい情報がほしいときは、`host.onEvent` で受け取ってください（`message.start`、
`message.delta`、`message.complete`）。

`host.onEvent` は、ゲートウェイのイベント（出力の差分、セッションの節目、ツールの動き）を
流し続けます。リスナーは切り離されているので、自分のリスナーで例外が出てもアプリの配信には
影響しません。`host` のどの窓口も非同期で安全です。内部の処理から同期的に投げられた例外
（素のブラウザーでデスクトップの橋渡しが無い場合など）は、`.catch()` で受け取れる拒否になり、
エラー境界での異常終了にはなりません。

`ctx.os` は、選び抜かれた OS への窓口です。プラグインがアプリのウィンドウの外へ手を伸ばす
経路をすべて、そのプラグインに紐づけて 1 つの名前空間にまとめてあります。`ctx.os.notify` は
**OS のネイティブな通知**を出します。アプリ自身の承認やターンの知らせが使うのと同じ Electron の
経路です。これは利用者が Hermes から離れているとき（背面や、焦点が外れているとき）にだけ
出ます。利用者がアプリを見ているときのアプリ内のトーストには `host.notify` を使ってください。
利用者は端末ごとに、設定の Notifications にある「Plugin notifications」で止められますし、
同じプラグインからの繰り返しは絞られます。ログ代わりではなく、本当に知らせる価値のある
出来事の合図として使ってください。

見せ方と押したときの動き（もとの `ctx.os` の窓口を拡張したものです）。

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

`activate` はディープリンクと同じ書き方です。`hermes://index-network/intent/1` と、ハッシュの
パス `/index-network/intent/1` は、アプリ内の同じルートに解決されます（同じ `hermes://…` の
URL は OS のディープリンクとしても働きます）。操作のボタンが出るのは署名済みの macOS の
ビルドだけですが、それ以外でも本文をクリックすれば反応します。画面移動が起きるのは利用者が
クリックしたときだけで、背景のイベントだけでは起きません。

ほかの窓口（`openExternal`、`revealPath`、`writeClipboard`）は、その機能が使えないとき
（古いデスクトップの外殻、素のブラウザー）に例外を投げるのではなく `false` を返します。橋渡しの
有無を探るのではなく、この戻り値で分岐してください。

### デスクトップの外観の設定 — `host.settings` {#desktop-appearance-settings-hostsettings}

`host.settings` は、Desktop のローカルな外観の好みのうち、プラグインがネイティブの Settings の
ページと共有してよい少数の項目のための正式な窓口です。どのキーも、Settings のページ自身が使う
保存先の atom と設定用の関数に結び付いているので、プラグインの書き込みは、利用者がその操作を
クリックしたのとまったく同じです。すぐに効き、その好みの既存の保存形式のまま残り、最後の書き込みが
勝ちます（そのあと値を「持つ」プラグインはいないので、`set` について後片付けするものはありません）。

```ts
type DesktopSettingValues = {
  'backdrop.v1': boolean
  'composerPopout.gesturesEnabled': boolean
  'intro-splash.v1': boolean
  'reasoning.collapsedByDefault': boolean
  sessionListDensity: 'compact' | 'comfortable' | 'detailed'
  tabStripDefault: 'auto' | 'always' | 'never'
}
host.settings.get<K extends DesktopSettingKey>(key: K): DesktopSettingValues[K]
host.settings.set<K extends DesktopSettingKey>(key: K, value: DesktopSettingValues[K]): void
host.settings.subscribe<K extends DesktopSettingKey>(key: K, fn: (value: DesktopSettingValues[K]) => void): () => void
```

```ts
register(ctx) {
  host.settings.set('sessionListDensity', 'detailed')

  // subscribe emits the current value now, then after every native or plugin write.
  const dispose = host.settings.subscribe('backdrop.v1', enabled => { /* … */ })
  // Teardown rule: `host` is a module singleton and cannot tell which plugin
  // subscribed, so YOU retire the listener — otherwise it outlives a disable/reload.
  ctx.onDispose(dispose)
}
```

調停: 上の許可の一覧は閉じています。知らないキーや、キーの型に合わない値は**同期的に**例外を
投げ（`Unsupported desktop setting: …` /
`Invalid value for desktop setting: …`）、何も書き込まれません。`host.settings` は
`localStorage` に直接触れないので、保存先の形式や移行の処理を迂回することはできません。
古い Desktop のビルドにも対応するなら、`host.settings` の有無を確かめてください。

意図して**キーにしていない**ものと、その理由:

| ほしいもの | 代わりに使うもの | 生のキーにしない理由 |
|--------|-------------|-------------------|
| キー割り当ての表（`hermes.desktop.keybinds`） | `KEYBINDS_AREA` のコントリビューション | 表を直接書くと、ほかのすべてのプラグインのショートカットまで割り当て直してしまいます。この領域はプラグインごとにまとめ、プラグインと一緒に片付けます |
| 今のテーマやモードの記録 | `THEMES_AREA`（テーマを登録し、利用者が選ぶ） | テーマの選択はウィンドウやプロファイルごとで、アプリが調停するものです。平らな好みではありません |
| `pluginDecisions`（デスクトップのプラグインの有効・無効） | アプリの Plugins のタブ（読み取り専用の表示は別の SDK のフックです） | あるプラグインが別のプラグインの有効・無効を切り替えるのは、プラグイン同士の干渉そのものです |
| `toolView.technical`、`embed-mode`、`titlebarAppActions`、`translucency.v2`、`user-bubble-transparency.v1`、`hermesDesktop.zoom.*` | それぞれの保存先を監査したあとで足す予定のキー | 一部はメインプロセスやウィンドウの枠を動かします。プラグインから書けるようにする前に、それぞれに専用の守りと持ち主の確認が要ります |

移行 — `hermes-appearance-hub` は今、
`localStorage.setItem('hermes.desktop.sessionListDensity', id)` のあとに
`window.dispatchEvent(new StorageEvent('storage', …))` を流して、アプリの保存先
（`readSimpleKey`/`writeSimpleKey`、`readBoolKey`/`writeBoolKey`）を起こしています。

```ts
// before
localStorage.setItem('hermes.desktop.backdrop.v1', String(on))
window.dispatchEvent(new StorageEvent('storage', { key: 'hermes.desktop.backdrop.v1', newValue: String(on) }))
// after — the store notifies its own subscribers; no synthetic StorageEvent
host.settings.set('backdrop.v1', on)
host.settings.set('sessionListDensity', id)          // was hermes.desktop.sessionListDensity
host.settings.set('tabStripDefault', id)             // was hermes.desktop.tabStripDefault
host.settings.set('reasoning.collapsedByDefault', on) // was hermes.desktop.reasoning.collapsedByDefault
host.settings.set('composerPopout.gesturesEnabled', on)
host.settings.set('intro-splash.v1', mode !== 'off') // replaces clicking #setting-field-appearance.intro-splash
```

読み取りは `host.settings.get(key)` になります。Settings のページの intro-splash のスイッチに
掛けていた `MutationObserver` は `host.settings.subscribe('intro-splash.v1', fn)` になります
（破棄用の関数は `ctx.onDispose` へ）。`prompt-snippets` は、自分のショートカットの控えとして
`localStorage.getItem('hermes.desktop.keybinds')` を読んでいますが、これは上の表のキー割り当ての
行にあたります。既定の割り当ては `KEYBINDS_AREA` から出し、利用者による上書きはアプリの表ではなく
`ctx.storage` に持ってください。

### 型付きの機能の橋渡し — `host.skills`、`host.toolsets`、`host.profiles`、`host.pluginDecisions` {#typed-capabilities-bridge-hostskills-hosttoolsets-hostprofiles-hostplugindecisions}

```ts
type ProfileScope = undefined | null | string | { connectionId?: null | string; profile?: null | string }

host.skills.list(profile?: ProfileScope): Promise<SkillInfo[]>
host.skills.setEnabled(name: string, enabled: boolean, profile?: ProfileScope): Promise<{ ok: boolean; name: string; enabled: boolean }>
host.toolsets.list(profile?: ProfileScope): Promise<ToolsetInfo[]>
host.toolsets.setEnabled(name: string, enabled: boolean, profile?: ProfileScope): Promise<{ ok: boolean; name: string; enabled: boolean }>
host.profiles.list(scope?: ProfileScope): Promise<{ profiles: ProfileInfo[] }>
host.pluginDecisions: ReadableAtom<Record<string, boolean>>   // get() / subscribe() / listen() — no set()
```

これらは、**Capabilities のページが呼んでいるのと同じ `api/*` のモジュールの関数**
（`GET /api/skills`、`PUT /api/skills/toggle`、`GET /api/tools/toolsets`、
`PUT /api/tools/toolsets/<name>`、`GET /api/profiles`）を、ページと同じプロファイルの範囲付けで
包んだものです。`profile` を省くと、アプリ全体で今有効なプロファイルに対して動きます。名前か
`{ connectionId, profile }` の経路を渡すと、前面のプロファイルを切り替えずに別のプロファイルを
設定できます。新しく調停するものはありません。どの呼び出しも、もともと `host.request` から
届くものです。価値は型付けとプロファイルの範囲付けにあるので、`window.hermesDesktop.api` を
生のまま呼ぶのはやめてください。

`host.pluginDecisions` は、アプリのプラグインの有効・無効の表（プラグインの id →
`true`/`false`。id が無ければ利用者はまだ選んでおらず、そのプラグイン自身の
`defaultEnabled` が効きます）を映したものです。これは**設計として読み取り専用**です。`set()` が
あると、あるプラグインが別のプラグインの有効・無効を切り替えられてしまいます。まさに
「プラグイン同士が互いの機能をいじる」状態です。しかも `host` はモジュールで 1 つしかないので、
どのプラグインが呼んでいるかがわからず、書き込みを呼び出し元自身の id に限ることもできません。
このオブジェクトには、型の上だけでなく実行時にも
`set` がありません。また、渡す値（`get()`、
`.value`、`subscribe`/`listen` のコールバックの引数）はどれも**凍結した複製**なので、そこへ
代入すると、アプリが読んで保存する表に漏れ出すのではなく例外になります。プラグインの有効・無効の
切り替えは、アプリの Plugins のタブに任せたままです。そこへのリンクは
`host.navigate('/capabilities?tab=plugins')` で張ってください。

後片付け: これらの動詞は、ページが書くのと同じバックエンドの状態を書く、利用者が起こす 1 回ごとの
操作です。そのあと持ち主になるものはなく、後片付けするものもありません。`host.pluginDecisions` の
`subscribe()` は破棄用の関数を返します。無効にされたり読み込み直されたりしたプラグインが
聞き続けないように、それを `ctx.onDispose` に登録してください。

移行（better-capabilities）:

```ts
// before                                                  // after
desktopApi({ path: '/api/skills' })                        host.skills.list()
desktopApi({ path: '/api/skills/toggle', method: 'PUT',    host.skills.setEnabled(name, enabled)
  body: { name, enabled } })
desktopApi({ path: '/api/tools/toolsets' })                host.toolsets.list()
desktopApi({ path: `/api/tools/toolsets/${name}`,          host.toolsets.setEnabled(name, enabled)
  method: 'PUT', body: { enabled } })
desktopApi({ path: '/api/profiles' })                      host.profiles.list()
JSON.parse(localStorage.getItem(                           host.pluginDecisions.get()
  'hermes.desktop.pluginDecisions.v2'))                    ctx.onDispose(host.pluginDecisions.subscribe(fn))
localStorage.setItem('hermes.desktop.pluginDecisions.v2')  // declined — host.navigate('/capabilities?tab=plugins')
row.querySelector('[data-slot="switch"]').click()          // same: the app's Plugins tab owns the toggle
```

## データの層 — React Query と nanostores {#data-layer-react-query-nanostores}

プラグインはアプリと同じ 1 つの `QueryClient` を共有します。そのためプラグインの問い合わせも、
中核の画面とまったく同じようにキャッシュされ、重複が省かれ、定期取得され、無効化されます。
取得のループを自作しないでください。

```javascript

function MyPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-plugin', 'items'],
    queryFn: () => host.request('my.list', {})
  })
  // …
}
```

きっかけとなる部品とパネルの間で共有する状態（や定期取得のループ）には、`atom` /
`computed` を使ってください。`host.state` が使っているのと同じ仕組みです。購読は、その値を
描画する末端で `useValue` を使って行います。React の**外**から問い合わせを無効にしたいときは
（`ctx.socket` のフレームが届いたときなど）、共有の `queryClient` を読み込んでください。

```javascript

ctx.socket('/events', () => {
  queryClient.invalidateQueries({ queryKey: ['my-plugin', 'items'] })
})
```

## UI キットとテーマ {#the-ui-kit-and-theming}

アプリの本物のコンポーネントをそのまま読み込めば、UI は何もしなくてもアプリに馴染みます。

> `Button`、`Input`、`Textarea`、`Select*`、`Switch`、`Checkbox`、
> `SegmentedControl`、`Tabs*`、`Dialog*`、`ConfirmDialog`、`DropdownMenu*`、
> `ContextMenu*`、`Popover*`、`Tip`/`Tooltip*`、`Badge`、`Kbd`/`KbdGroup`、
> `SearchField`、`ScrollArea`、`Separator`、`Skeleton`、`GlyphSpinner`、`Loader`、
> `EmptyState`、`ErrorState`、`CopyButton`、`StatusDot`、`LogView`、`Codicon`、
> `DecodeText`。

`DecodeText` の `loop` は、この変更から明示指定になりました。既定では 1 回だけ解読してそのまま止まるので、ずっと文字を崩し続けたい進捗の表示では `loop` を明示的に渡してください。

さらに補助的なものとして、`cn`（クラスの結合）、`icons.*`（アプリの lucide 一式）、`haptic`、
`profileColor` / `profileColorSoft`（素性から決まる色）、時刻の整形処理
`relativeTime` / `fmtDateTime` / `fmtDayTime` / `coarseElapsed`、
`useI18n`（地域化した文言。プラグインも翻訳できるままになります）、そして
`evaluateRuntimeReadiness` があります。

**色は直接書かず、テーマの変数で組み立ててください。** ペインはすでにアプリのエディターの
背景の上に載っています。背景はそのままにして、それ以外は変数を使ってください。
`var(--ui-text-secondary)`、`var(--ui-text-tertiary)`、
`var(--ui-text-quaternary)`、`var(--ui-stroke-secondary)`、`var(--ui-accent)` です。
canvas へ描くときは、
`getComputedStyle(canvas).getPropertyValue('--ui-accent')` で一度だけ値を取ってください。
これがあるおかげで、どのテーマに変えてもプラグインの見た目が自動で付いてきます。

## プラグインのバックエンド {#a-backend-for-your-plugin}

サーバー側の処理が必要なら、Python の `plugin_api.py` を同梱して、`ctx.rest` / `ctx.socket` から
呼んでください。**仕組みの上で**そのプラグインだけに区切られた名前空間になります。

### 1 つのパッケージで両方の SDK {#one-package-both-sdks}

デスクトップの UI **と**エージェント側のコード（Python のプラグイン、そのバックエンドの経路、
スキル）の両方が必要な機能でも、互いに依存する 2 つのインストールに分ける必要はありません。
エージェントのパッケージの中に `desktop/plugin.js` を置いてください。そのパッケージがローカルの
`plugins/` のいずれか（既定の置き場所でもプロファイルでも）に入ると、Electron のメインプロセスが
デスクトップ側だけを `$HERMES_HOME/desktop-plugins/<id>/` へ複製し、そこに
`.hermes-package.json` の目印を置きます。そしてレンダラーは、単体のディスクの窓口とまったく
同じ経路でそれを読み込みます（その場での入れ替えも含みます）。

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

`desktop/plugin.js` の側は、ごく普通のディスク型のプラグインです。取り決めも読み込みも同じで、
`ctx.rest('/…')` は隣にある `plugin_api.py` に届きます。導入も共有も削除もフォルダー 1 つで
済みます。アプリの置き場所にある複製は、元の `plugin.js` が変わると更新され（`hermes plugins update`
か、**Rescan**）、パッケージのフォルダーが消えれば一緒に消えます。この複製こそが、デスクトップ側を
**アプリ単位**にしているものです。パッケージを持つプロファイルがいくつあっても複製は 1 つだけで、
利用者が Capabilities のプロファイルの選択を切り替えても現れたり消えたりしません。レンダラーが
自分で `plugins/` を走査することはありません。目印にはパッケージ名とその出どころ（カタログの
付属情報か git のリモート）が記録されていて、Plugins のページの **Install here** ボタンは、
これを使ってエージェント側を別のプロファイルへ入れます。複製は目的地の隣に用意してから名前を
変えて置かれるので、複製が中断しても（一時的なファイルのロック、途中での異常終了）、書きかけの
フォルダーが残ることはありません。目印も `plugin.js` も無い `desktop-plugins/<id>/` が残っていた
場合は、そうした壊れた状態とみなして次の **Rescan** で置き換えます。一方、目印は無いが
`plugin.js` は*ある*フォルダーは、手で入れた単体のプラグインなので、上書きされることはありません。

有効にする切り替えが 2 つあるのは意図的で、どちらも既定は**無効**です。デスクトップ側は
明示的に有効にする形で配られます。**Capabilities → Plugins** には並びますが、利用者が切り替えるまで
無効のままです。これは Python 側の `config.yaml` での `plugins.enabled` の制御（後述のセキュリティ上の
線引き）と揃えたものです。`~/.hermes/plugins` にパッケージを置いただけでは、どの面でも何も
起きません。バックエンド側が無効でも、デスクトップ側はうまく働きを落とします。`ctx.rest` は
異常終了ではなくエラーを返します。

:::note
この複製は、デスクトップアプリが動いているマシンの中だけの話です。遠隔のバックエンドに対しては、
向こうのマシンの `~/.hermes/plugins` にファイルとして手が届かないので、この方法でデスクトップ側が
足されるのはローカルに入れたパッケージだけです。遠隔のバックエンドの場合、インストールの
ダイアログがデスクトップ側だけを別途 `desktop-plugins/` に取ってきます。デスクトップ専用の
リポジトリと同じ扱いです。エージェント側だけを遠隔のホストに入れて、この取得をしていない
パッケージは、Plugins のページでデスクトップ側が**利用不可（遠隔のバックエンド）**と表示されます。
複製待ちではありません。そして説明の吹き出しが、Desktop を選んだ状態の **Install from Git** を
案内します。
:::

### インストール用のリンクで配る {#install-link}

プラグインのリポジトリ（エージェント側、デスクトップ側、またはその両方）を公開し、`hermes://`
のスキームでリンクしてください。自分のサイトや README に置く、ただのリンクです。

```html
<a href="hermes://plugin/install?repo=owner/repo&enable=1">Install in Hermes</a>
```

利用者には確認のダイアログが出て（リポジトリの id、出どころのリンク、そのリポジトリが何を
含むかの下調べ）、何かが入る前に部品を選べます。ディープリンクが勝手にインストールすることは
ありません。`force=1` を付けると既存のインストールを置き換えます。開発用のビルドでは
`hermes-dev://` です。リンクの詳しい説明は
[ワンクリックのインストールリンク](/hermes/docs/user-guide/features/plugins/#one-click-install-links-desktop)にあります。

### Python 側 {#the-python-side}

デスクトップのプラグインは、ダッシュボードのプラグインのバックエンドの置き場所を使い回します。
通常の Hermes のプラグインの `dashboard/` というサブフォルダーにバックエンドを置き、
`manifest.json` で宣言してください。

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

経路は `/api/plugins/<id>/` の下に置かれます（`GET /api/plugins/<id>/board` など）。
バックエンドのコードはゲートウェイのプロセスの中で動くので、hermes-agent のコードを直接
読み込めます（`hermes_state`、`hermes_cli.config` など）。バックエンドの説明の全体は
[ダッシュボードを拡張する → バックエンドの API の経路](/hermes/docs/user-guide/features/extending-the-dashboard/#backend-api-routes)を
参照してください。置かれ方はまったく同じです。

:::caution Python のバックエンドは別に制御されます
デスクトップの **Capabilities → Plugins** のパネルでプラグインを有効にするのは、レンダラー側の
選択です。それだけでは Python は**読み込まれません**。利用者のプラグインの `plugin_api.py` が
読み込まれるのは、`config.yaml` の `plugins.enabled` の許可一覧にそのプラグインがある（かつ
`plugins.disabled` に無い）ときだけです。プロジェクトのプラグイン（`./.hermes/`）が Python を
自動で読み込むことはありません。これは見落としではなく、セキュリティ上の線引きです
（GHSA-mcfc-hp25-cjv7）。
:::

#### デスクトップ側へイベントを送る {#pushing-events-to-your-desktop-half}

バックエンドはゲートウェイのプロセスの中で動くので、アプリ全体のイベントの流れ —
`host.onEvent` が購読しているのと同じ流れ — を使って、自分のデスクトップ側へ更新を送れます。

```python
from hermes_cli.plugin_events import broadcast_plugin_event

broadcast_plugin_event("rss-reader", "feed.updated", {"count": 3})
# → event "plugin.rss-reader.feed.updated" reaches every connected desktop client
```

```javascript
// register(ctx): the subscription is retired with the plugin
host.onEvent('plugin.rss-reader.feed.updated', ({ payload }) => refreshFeeds(payload))
```

`broadcast_plugin_event(plugin_id, event, payload=None)` で送られるイベントの名前は、常に
`plugin.<plugin_id>.<event>` です。`plugin_id` はカタログでの名前です
（`[a-z0-9_-]{1,64}`、ドットは不可。これが名前空間なので、ほかのプラグインの名前を名乗ることは
できません）。`event` は**素の**ドット区切りの名前です（`"feed.updated"` であって
`"plugin.rss-reader.feed.updated"` ではありません）。各区切りは `[A-Za-z0-9_-]` なので、`""`、
`"../x"`、`"a..b"` は、誰も出さない名前でデスクトップ側を待ちぼうけにさせる代わりに
`ValueError` を投げます。`payload` は JSON の dict で（省くと `{}`）、イベントの `payload` として
届きます。フレームは、ほかの全体のイベントと同じく `session_id: ""` を持ちます。送りっぱなしで
届けるので（固まったクライアントは飛ばされ、自分の処理が止まることはありません）、どこに届くかは
呼び出しが動いているプロセスで決まります。

| 呼び出し元が動いている場所 | 届く先 |
|---|---|
| `hermes serve`（Desktop のバックエンド）: `plugin_api.py` の経路、プラグインのスラッシュコマンド、エージェントのターンの中のツールとフック | つながっているすべての Desktop のウィンドウ |
| `dashboard.turn_isolation` の計算用の子プロセス（隔離したターンのツールとフック） | ホストとの管を通って `hermes serve` へ中継され、そこからすべてのウィンドウへ |
| stdio の TUI（端末での `hermes`） | その端末のクライアント |
| `hermes gateway run`（メッセージングのプラットフォーム）、`hermes chat`、cron、`hermes plugins validate` | どこにも届きません。そのプロセスには Desktop のクライアントがつながっていないので、呼び出しはログに残るだけで何もしません |

`tui_gateway.server` の内部を読み込む代わりに、これを使ってください。接続ごとに中身を変えた、
プラグイン専用のフレームが要るなら、これまでどおり `ctx.socket('/events')` のほうが
多くのことができる窓口です。

移行（rss-reader）: `~/.hermes/rss-reader/commands.jsonl` の待ち行列、
`GET /commands`、3 秒ごとの `ctx.rest('/commands')` の問い合わせをやめます。Python 側は、
これまで待ち行列に入れていた場所で `broadcast_plugin_event('rss-reader', 'feed.updated', payload)` を
呼び、デスクトップ側はタイマーの代わりに `register(ctx)` の中で
`host.onEvent('plugin.rss-reader.feed.updated', fn)` を使います。

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

`ctx.rest` はプロファイルを意識し、パスの遡り（`..`）を拒否します。そのため、これを通して
ほかのプラグインの API や中核の経路を叩くことはできません。`PluginRestOptions` は
`{ method?, body?, upload?: { filename, contentType?, bytes }, timeoutMs? }` です。

`ctx.socket` は、破棄されるまで間隔を空けながら自動で再接続します。**OAuth の遠隔環境では
何もしません**（1 回限りの WebSocket の切符は中核が管理しているためです）。ソケットは定期取得を
速くするためのものであって、置き換えではないと考えてください。どのみちソケットは切れることが
あるので、使う側には必ず定期取得の代替が要ります。

自分の名前空間ではなくゲートウェイ全体のデータを扱うなら、代わりに `host.request`（JSON-RPC）と
`host.onEvent`（ゲートウェイのイベント）を使ってください。

## 設定、有効・無効の状態、保存 {#settings-enable-state-and-storage}

有効かどうかにかかわらず、すべてのプラグインが **Capabilities → Plugins** に並びます。利用者は
そこでその場で切り替えたり（アプリの再起動は不要です）、フォルダーを開いたり、再走査したり
できます。利用者の選択は覚えられます。

- まだ選んでいない場合 → そのプラグインの `defaultEnabled`（既定は `true`）に従います。
  `defaultEnabled: false` にすると、利用者が入れるまで何もしない、明示的に有効にする形の
  プラグインとして配れます。
- 明示的に選んだ場合 → 保存され、再起動しても守られます。無効にされたプラグインは無効のままです。
  逆らわないでください。利用者はあなたを切ったのです。

自分の状態は `ctx.storage` で保存します。プラグインごとに名前空間が分かれているので
（`hermes.plugin.<id>.*`）、プラグイン同士が読み合ったり壊し合ったりすることはありません。

```javascript
ctx.storage.set('lastTab', 'board')
const tab = ctx.storage.get('lastTab', 'summary')
ctx.storage.remove('lastTab')
```

## 同梱のプラグイン {#bundled-plugins}

プラグインは、ツリー内の `apps/desktop/src/plugins/<id>/plugin.tsx` として配れます
（`HermesPlugin` を default export します）。起動時に `discoverBundledPlugins()` が見つけるので、
読み込みの記述も登録簿の編集も要りません。一覧への表示も、その場での有効・無効の切り替えも、
ディスク型のプラグインとまったく同じです。違いは 2 つです。

1. アプリの Vite のビルドを通るので、**本物の JSX** を書けますし、SDK を
   `@hermes/plugin-sdk` の別名で読み込めます。
2. それでも lint による制限は同じで、`@hermes/plugin-sdk` と `react` だけです。`@/…` という
   アプリの内部は使えません。

今のところ、中核のツリーにデスクトップのプラグインは入っていません。配られるアプリはすっきりした
ままにして、実例は
[`hermes-example-plugins`](https://github.com/NousResearch/hermes-example-plugins)
という別リポジトリに置いています。

## セキュリティの考え方 {#security-model}

読み込まれたプラグインは、レンダラーの実行環境で ESM として評価され、**アプリと同じ権限**を
持ちます。React の単一のインスタンス、SDK 全体（`host.request` のゲートウェイ RPC、
`ctx.rest`、保存、`navigate`）、そして `window.hermesDesktop` のネイティブの橋渡し
（ファイル、git、端末、インストール）です。読み込む側が提供する隔離は**エラーの隔離だけ**です。
プラグインがアプリを落とすことはできませんが（コントリビューションにはエラー境界があり、
リスナーは切り離され、`register()` が例外を投げれば巻き戻してそのプラグインの行に報告します）、
アプリにできることは何でもできます。プラグインの保存の名前空間は取り決めであって、壁ではありません。

これが受け入れられるのは**ローカル**の出どころだからです。ディスク上のファイルは、そもそも
あなたのマシンでコードを実行できます。だからこそディスクの窓口は、あなた（またはあなたの
エージェント）が書いたローカルのファイルしか読み込みません。[カタログ](/hermes/docs/user-guide/features/plugin-catalog/#trust-model)
からのインストールでは、信頼の根拠は受け入れの審査です。人間が、固定された特定のコミットを
確認しています。それを 2 つの仕掛けが支えます。受け入れのときの `desktop surface` の lint と、
読み込み側の許可一覧です（`@hermes/plugin-sdk` と `react*` だけで、それ以外は静的でも動的でも、
`https:` の URL も含めて `import` すると読み込みに失敗します）。どちらもサンドボックスでは
ありません。将来、遠隔の出どころへの窓口を作るなら、その前に本物の境界（iframe や worker、
CSP、権限の制御）が必要です。この経路を信頼の境界として扱わないでください。

## つまずきやすいところ {#pitfalls}

- **ディスク型のプラグインでは JSX は解釈できません。** ファイルはコンパイルせずに読み込まれるので、
  JSX の構文ではなく `jsx()` /
  `jsxs()`（または `React.createElement`）を使ってください。（同梱のプラグインはビルドされるので、
  そちらでは JSX で構いません。）
- **解決できる指定子は 3 つだけです。** `@hermes/plugin-sdk`、`react`、
  `react/jsx-runtime` です。ほかの読み込みは、最初に読み込みエラーとして現れます。
- **色を直接書かないでください**（`#000`、`black`、`rgb(...)`）。背景はそのままにして、
  ほかはすべてテーマの変数（`var(--ui-*)`）を使ってください。
- **読み込んだものだけを使ってください。** 読み込み忘れたコンポーネント（たとえば
  `StatusDot`）は、描画のときに `ReferenceError` になります。`jsx()` の呼び出しに出てくる名前が
  すべて読み込みの行にあるか、二度確かめてください。
- **処理の中では状態をその都度読んでください**（`$atom.get()`）。描画時の値をそのまま
  抱え込んではいけません。連続するイベントで古い値を見てしまいます。購読（`useValue`）は、
  その値を描画する末端だけで行います。
- **canvas のペインは、入れ物に追随させてください。** `ResizeObserver` で監視して canvas の
  大きさを変えます（CSS だけでなく width と height の属性も）。ペインは頻繁に大きさが変わります。
- **`host.request` を数秒より短い間隔で繰り返さないでください。** `host.onEvent` や
  `ctx.socket` を優先し、重複の除去は React Query に任せます。
- **裸のグローバルは追跡されません。** `window.setInterval`、`window.addEventListener`、
  自分で足した `<style>` などをホストは見ていないので、無効にしても、その場で入れ替えても
  残り続けます（ES のモジュールは取り外せないので、編集を繰り返すと生きた複製が積み上がります）。
  `ctx.setTimeout` / `ctx.setInterval` / `ctx.addEventListener` を使い、それ以外は
  `ctx.onDispose` につないでください。モジュールの範囲の状態は、自分で戻す責任があります。
- **モジュールの評価には 10 秒の期限があります。** 決着しないトップレベルの `await`
  （立ち上がっていないゲートウェイを待つなど）は、プラグインの走査を止める代わりに `import timed
  out` として読み込みに失敗します。待つ処理は `register()` の中で行ってください。
- **1 つの id につき 1 つのファイル。** 同じ `id` を export するフォルダーが 2 つある場合
  （単体で入れたものと、一体型のパッケージの複製が並んでいる場合など）、フォルダー名の順で先勝ちに
  なり、あとのほうは Capabilities ▸ Plugins の自分の行に `duplicate id` と表示されます。
- **`ctx.socket` は OAuth の遠隔環境では何もしません。** 常に定期取得の代替を用意してください。

## 早見表 {#reference}

### SDK が公開するもの一覧 {#sdk-exports-at-a-glance}

| 分類 | 公開されるもの |
|----------|---------|
| ホスト | `host`（`.state.*`、`.settings`、`.notify`、`.notifyError`、`.navigate`、`.onEvent`、`.logs`、`.status`、`.restartGateway`、`.request`、`.composer`、`.sessions`、`.skills`、`.toolsets`、`.profiles`、`.pluginDecisions`） |
| プラグインの取り決め | `HermesPlugin`、`PluginContext`、`PluginContribution`、`PluginStorage`、`PluginOs`、`PluginRestOptions`、`PluginNativeNotificationInput`、`PluginNotificationAction`、`HermesOpenTarget`、`Contribution` |
| 領域の定数 | `PANES_AREA`、`ROUTES_AREA`、`SIDEBAR_NAV_AREA`、`STATUSBAR_AREAS`、`TITLEBAR_AREAS`、`WORKSPACE_PAGE_HEADER_AREA`、`PALETTE_AREA`、`KEYBINDS_AREA`、`THEMES_AREA`、`COMPOSER_AREAS`、`SESSION_ROW_AREAS`、`SIDEBAR_NAV_PREFS_AREA`、`APPEARANCE_AREAS` |
| 領域ごとの中身 | `RouteContribution`、`SidebarNavContribution`、`StatusbarItem`、`TitlebarTool`、`PaletteContribution`、`KeybindContribution`、`ComposerMiddleware`、`ComposerAttachmentProvider`、`SessionRowSlotContribution`、`SidebarNavPrefsContribution` |
| React と状態 | `useValue`、`atom`、`computed`、`useQuery`、`useMutation`、`useQueryClient`、`queryClient`、`Contribute` |
| テーマ | `useTheme`、`requestTheme`、`setAccentOverride`、`$accentOverride`、`retintTheme`、`themeHue`、`DesktopTheme`、`DesktopThemeColors`。さらに OKLCH の計算（`hexToOklch`、`oklchToHex`、`oklchToSrgb255`、`mixOklab`、`maxChroma`、`hueDelta`、`normalizeHex`）と sRGB の測定（`contrastRatio` は `number | null` で、解析できない入力では null、それに `readableOn`） |
| UI キット | `Button`、`Input`、`Textarea`、`Select*`、`Switch`、`Checkbox`、`SegmentedControl`、`Tabs*`、`Dialog*`、`ConfirmDialog`、`DropdownMenu*`、`ContextMenu*`、`Popover*`、`Tip`/`Tooltip*`、`Badge`、`Kbd`/`KbdGroup`、`SearchField`、`ScrollArea`、`Separator`、`Skeleton`、`GlyphSpinner`、`Loader`、`EmptyState`、`ErrorState`、`CopyButton`、`StatusDot`、`LogView`、`Codicon`、`DecodeText`、`SandboxedFrame` |
| 補助 | `cn`、`icons`、`haptic`、`useI18n`、`profileColor`、`profileColorSoft`、`relativeTime`、`fmtDateTime`、`fmtDayTime`、`coarseElapsed`、`evaluateRuntimeReadiness` |

いつでも最新の正式な一覧は `apps/desktop/src/sdk/index.ts` です。

### エージェント向け: `hermes-desktop-plugins` スキル {#agents-the-hermes-desktop-plugins-skill}

エージェントがデスクトップのプラグインを書くときは、同梱の
**`hermes-desktop-plugins`** スキルを読み込ませてください。このページと同じ内容を、エージェントが
使いやすい形で持っていて、そのまま写せる `templates/plugin.js` も付いています。このページは
人間の開発者向けの説明で、スキルのほうは実作業の確認表です。

## 困ったときは {#troubleshooting}

**プラグインが現れない。** ファイルが
`$HERMES_HOME/desktop-plugins/<id>/plugin.js` にあり、フォルダー名が export した
`id` と一致しているか確かめてください。⌘K → **Reload desktop plugins** を実行します。失敗を
知らせるトーストが出ていないかアプリを確認し、`hermes logs gui -f` でログを追ってください。

**読み込みで「unsupported import」と出る。** ディスク型のプラグインが読み込めるのは
`@hermes/plugin-sdk`、`react`、`react/jsx-runtime` だけです。ほかの読み込みを消してください。

**`jsx` の要素が何も出ない、または `ReferenceError` になる。** `jsx()` の呼び出しで使っている名前が
読み込まれていません。読み込みの行に足してください。

**`ctx.rest` が 404 を返す。** バックエンドが載っていません。
`~/.hermes/plugins/<id>/dashboard/manifest.json` に `"api": "plugin_api.py"` があるか、
そのプラグインが `config.yaml` の `plugins.enabled` にあるかを確かめて、ゲートウェイを
再起動してください（バックエンドの経路は起動時に載ります）。`~/.hermes/logs/errors.log` に
`Failed to load plugin <id> API routes` が出ていないか追ってください。

**`ctx.socket` がまったく動かない。** OAuth の遠隔環境では、設計どおり何もしません。定期取得の
代替を使ってください。そうでなければ、バックエンドが自分の名前空間に対応する
`@router.websocket(...)` の経路を出しているか確かめてください。

**テーマを切り替えると色がおかしい。** 色を直接書いています。
`var(--ui-*)` のテーマの変数に置き換えてください。
