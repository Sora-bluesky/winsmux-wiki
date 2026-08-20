---
title: "ブラウザの CDP スーパーバイザ"
description: "Hermes が JavaScript のネイティブなダイアログを見つけて応答するしくみと、常時つないだ CDP 経由で別オリジンの iframe を操作するしくみ。"
upstream_path: developer-guide/browser-supervisor.md
upstream_blob: a30abdbdaca5a6daaf0e9d85de2fb2d14f714fea
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/browser-supervisor
---

# ブラウザの CDP スーパーバイザ {#browser-cdp-supervisor}

CDP スーパーバイザは、Hermes のブラウザ操作に長く残っていた 2 つの穴をふさぎます。

1. **JavaScript のネイティブなダイアログ**（`alert`/`confirm`/`prompt`/`beforeunload`）は、
   ページの JavaScript の処理を止めてしまいます。見張るしくみがないと、エージェントは
   ダイアログが開いていることに気づけず、そのあとのツール呼び出しが固まるか、
   理由の分からないエラーになります。
2. **別オリジンの iframe（OOPIF）** は、最上位の `Runtime.evaluate` からは見えません。
   エージェントは DOM のスナップショットで iframe のノードを見ることはできますが、
   子ターゲットに CDP のセッションをつながないかぎり、その中でクリックも入力も
   評価もできません。

スーパーバイザは、ブラウザのタスクごとにバックエンドの CDP エンドポイントへ WebSocket を
つなぎっぱなしにし、待機中のダイアログとフレームの構造を `browser_snapshot` に載せ、
明示的に応答するための `browser_dialog` ツールを用意することで、この両方を解決します。

## 対応している実行基盤 {#backend-support}

| 実行基盤 | ダイアログの検出 | ダイアログへの応答 | フレームツリー | `browser_cdp(frame_id=...)` 経由の OOPIF での `Runtime.evaluate` |
|---|---|---|---|---|
| ローカルの Chrome（`--remote-debugging-port`）/ `/browser connect` | ✓ | ✓ ひととおり対応 | ✓ | ✓ |
| Browserbase | ✓（ブリッジ経由） | ✓ ひととおり対応（ブリッジ経由） | ✓ | ✓ |
| Camofox | ✗ CDP なし（REST のみ） | ✗ | DOM スナップショットで部分的に | ✗ |

**Browserbase のくせ。** Browserbase の CDP プロキシは内部で Playwright を使っていて、
ネイティブなダイアログを 10ms ほどで自動的に閉じてしまうため、`Page.handleJavaScriptDialog`
では間に合いません。そこでスーパーバイザは、`Page.addScriptToEvaluateOnNewDocument` で
ブリッジ用のスクリプトを差し込み、`window.alert`/`confirm`/`prompt` を、専用のホスト名
（`hermes-dialog-bridge.invalid`）へ同期の XHR を投げるものに置き換えます。`Fetch.enable` が
その XHR をネットワークに出る前に横取りするので、ダイアログはスーパーバイザが捕まえられる
`Fetch.requestPaused` のイベントになり、`respond_to_dialog` が `Fetch.fulfillRequest` で
JSON の本文を返して、差し込んだスクリプトがそれを読み取ります。

ページから見れば、`prompt()` はこれまでどおりエージェントが渡した文字列を返します。
エージェントから見れば、どちらの場合も同じ `browser_dialog(action=...)` の
使い方になります。

Camofox は対象外です。CDP の口がなく、REST のみだからです。

## 構成 {#architecture}

### CDPSupervisor {#cdpsupervisor}

Hermes の `task_id` ごとに、バックグラウンドのデーモンスレッドで `asyncio.Task` を 1 つ動かします。
バックエンドの CDP エンドポイントへの WebSocket をつないだまま保ち、次のものを管理します。

- **ダイアログの待ち行列** — `{id, type, message, default_prompt, session_id, opened_at}` を持つ `List[PendingDialog]`
- **フレームツリー** — `Dict[frame_id, FrameInfo]`。親子関係、URL、オリジン、別オリジンの子セッションかどうかを持ちます
- **セッションの対応表** — `Dict[session_id, SessionInfo]`。OOPIF を操作するとき、ツールが正しい接続済みセッションへ振り分けられるようにします
- **直近のコンソールエラー** — 診断用に直近 50 件をためるリングバッファ

接続時に購読するものは次のとおりです。

- `Page.enable` — `javascriptDialogOpening`、`frameAttached`、`frameNavigated`、`frameDetached`
- `Runtime.enable` — `executionContextCreated`、`consoleAPICalled`、`exceptionThrown`
- `Target.setAutoAttach {autoAttach: true, flatten: true}` — 子の OOPIF ターゲットを表に出します。スーパーバイザはそれぞれで `Page` と `Runtime` を有効にします

状態への読み書きはスナップショット用のロックで守られていて、同期で動くツールのハンドラは
待たずに凍結されたスナップショットを読めます。

### 起動から終了まで {#lifecycle}

- **開始:** `SupervisorRegistry.get_or_start(task_id, cdp_url)`。`browser_navigate`、
  Browserbase のセッション作成、`/browser connect` から呼ばれます。
  何度呼んでも結果は同じです。
- **停止:** セッションの片づけ、または `/browser disconnect` のとき。asyncio の
  タスクを取り消し、WebSocket を閉じ、状態を捨てます。
- **つなぎ直し:** CDP の URL が変わったとき（利用者が別の Chrome につなぎ直したときなど）は、
  古いスーパーバイザを止めて新しいものを立ち上げます。エンドポイントをまたいで
  状態が使い回されることはありません。

### ダイアログの扱い方 {#dialog-policy}

`config.yaml` の `browser.dialog_policy` で設定します。

- **`must_respond`**（既定）— ダイアログを捕まえて `browser_snapshot` に載せ、
  `browser_dialog(action=...)` が明示的に呼ばれるのを待ちます。安全のため 300 秒待っても
  応答がなければ、自動で閉じてログに残します。動きのおかしいエージェントが
  いつまでも止まったままになるのを防ぎます。
- `auto_dismiss` — 記録したうえですぐ閉じます。エージェントは、あとから
  `browser_snapshot` の中の `browser_state` で知ることになります。
- `auto_accept` — 記録したうえで承諾します（`beforeunload` で、そのまま
  きれいに次のページへ移りたいときに便利です）。

扱い方はタスク単位で決まり、ダイアログごとに上書きすることはできません。

## エージェントから見える部分 {#agent-surface}

### `browser_dialog` ツール {#browserdialog-tool}

```
browser_dialog(action, prompt_text=None, dialog_id=None)
```

- `action="accept"` / `"dismiss"` → 指定したダイアログ、または待機中のただ 1 つのダイアログに応答します（必須）
- `prompt_text=...` → `prompt()` のダイアログに渡す文字列
- `dialog_id=...` → ダイアログが複数たまっているときに、どれかを指定します（まれです）

このツールは応答するためだけのものです。エージェントは呼ぶ前に、待機中のダイアログを
`browser_snapshot` の出力から読み取ります。

### `browser_snapshot` の拡張 {#browsersnapshot-extension}

スーパーバイザがつながっているとき、これまでのスナップショットの出力に
3 つの項目が加わります。

```json
{
  "pending_dialogs": [
    {"id": "d-1", "type": "alert", "message": "Hello", "opened_at": 1650000000.0}
  ],
  "recent_dialogs": [
    {"id": "d-1", "type": "alert", "message": "...", "opened_at": 1650000000.0,
     "closed_at": 1650000000.1, "closed_by": "remote"}
  ],
  "frame_tree": {
    "top": {"frame_id": "FRAME_A", "url": "https://example.com/", "origin": "https://example.com"},
    "children": [
      {"frame_id": "FRAME_B", "url": "about:srcdoc", "is_oopif": false},
      {"frame_id": "FRAME_C", "url": "https://ads.example.net/", "is_oopif": true, "session_id": "SID_C"}
    ],
    "truncated": false
  }
}
```

- **`pending_dialogs`** — 今まさにページの JavaScript の処理を止めているダイアログです。
  エージェントは `browser_dialog(action=...)` を呼んで応答する必要があります。Browserbase では
  CDP プロキシが 10ms ほどで自動的に閉じてしまうため、ここは空になります。

- **`recent_dialogs`** — 直近で閉じられたダイアログを最大 20 件ためるリングバッファで、
  `closed_by` の印が付きます。`"agent"`（こちらが応答した）、`"auto_policy"`（ローカルの
  auto_dismiss / auto_accept）、`"watchdog"`（must_respond の待ち時間切れ）、
  `"remote"`（ブラウザや実行基盤の側で閉じられた。Browserbase など）です。Browserbase 上の
  エージェントでも、これで何が起きたかを見られます。

- **`frame_tree`** — 別オリジン（OOPIF）の子も含めたフレームの構造です。
  広告の多いページでスナップショットが膨らまないよう、30 件かつ OOPIF の深さ 2 までに
  抑えています。上限に達したときは `truncated: true` が出るので、全体が必要なエージェントは
  `browser_cdp` で `Page.getFrameTree` を使えます。

これらのためにツールのスキーマが増えることはありません。エージェントは、
もともと取得しているスナップショットを読むだけです。

### 使えるかどうかの切り分け {#availability-gating}

どちらの機能も `_browser_cdp_check`（CDP のエンドポイントに届くときだけ
スーパーバイザは動けます）で切り分けられます。Camofox や実行基盤のないセッションでは、
ダイアログのツールは表に出ず、スナップショットにも新しい項目は載りません。
スキーマが無駄に膨らむこともありません。

## 別オリジンの iframe の操作 {#cross-origin-iframe-interaction}

`browser_cdp(frame_id=...)` は、CDP の呼び出し（とくに `Runtime.evaluate`）を、
スーパーバイザがすでにつないでいる WebSocket と OOPIF の子の `sessionId` を通して
振り分けます。エージェントは `browser_snapshot.frame_tree.children[]` のうち
`is_oopif=true` のものから frame_id を拾い、`browser_cdp` に渡します。同一オリジンの
iframe（専用の CDP セッションがないもの）では、最上位の `Runtime.evaluate` から
`contentWindow` / `contentDocument` を使います。`frame_id` が OOPIF でないものを
指していた場合、スーパーバイザはその代わりの手を示すエラーを返します。

Browserbase では、iframe を操作する確実な方法はこれだけです。`browser_cdp` の呼び出しごとに
開く使い捨ての CDP 接続は、署名付き URL の期限切れに引っかかりますが、スーパーバイザの
長くつないだ接続なら有効なセッションを保てます。

## ファイルの配置 {#file-layout}

- `tools/browser_supervisor.py` — `CDPSupervisor`、`SupervisorRegistry`、`PendingDialog`、`FrameInfo`
- `tools/browser_dialog_tool.py` — `browser_dialog` ツールのハンドラ
- `tools/browser_tool.py` — `browser_navigate` の開始フック、`browser_snapshot` への合流、`/browser connect` でのつなぎ直し、`_cleanup_browser_session` での片づけ
- `toolsets.py` — `browser_dialog` を `browser`、`hermes-acp`、`hermes-api-server`、およびコアのツールセットに登録（CDP に届くかどうかで切り分け）
- `hermes_cli/config.py` — `browser.dialog_policy` と `browser.dialog_timeout_s` の既定値

## やらないこと {#non-goals}

- Camofox でのダイアログの検出と操作（上流側の穴。別途追いかけています）
- ダイアログやフレームのイベントを利用者へその場で流すこと（ゲートウェイ側のフックが必要になります）
- ダイアログの履歴をセッションをまたいで残すこと（メモリ上だけです）
- iframe ごとに別のダイアログの扱い方を決めること（エージェントは `dialog_id` で表現できます）
- `browser_cdp` を置き換えること。細かい用途（Cookie、表示領域、通信速度の制限など）の逃げ道として残します

## テスト {#testing}

単体テスト（`tests/tools/test_browser_supervisor.py`）では、プロトコルを必要な範囲で話す
asyncio のモック CDP サーバーを使い、状態の移り変わりをひととおり動かします。接続、有効化、
ページ移動、ダイアログの発生と却下、フレームの追加と切り離し、子ターゲットの接続、
セッションの片づけです。実際の実行基盤での E2E（Browserbase とローカルの
Chromium 系ブラウザ）は手作業です。動いている Chromium 系ブラウザに `/browser connect` して、
上に書いたダイアログとフレームの場合分けを試してください。
