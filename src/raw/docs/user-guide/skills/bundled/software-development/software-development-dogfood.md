---
title: "Dogfood — Web アプリを探索的にテストする: バグ、証拠、報告書"
description: "Web アプリを探索的にテストする: バグ、証拠、報告書"
upstream_path: user-guide/skills/bundled/software-development/software-development-dogfood.md
upstream_blob: 0e00dfa16cca805bb89bcd371f7d90e0a54ef0a1
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-dogfood
---

# Dogfood {#dogfood}

Web アプリを探索的にテストします。バグを見つけ、証拠を残し、報告書にまとめます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development/dogfood` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `qa`, `testing`, `browser`, `web`, `dogfood` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Dogfood: Web アプリを体系的に QA テストする {#dogfood-systematic-web-application-qa-testing}

## 概要 {#overview}

この skill は、`browser_exec` を使って Web アプリを体系的に探索テストする手順を示します。アプリの中を移動し、要素を操作し、問題の証拠を残して、構造化されたバグ報告書を作ります。

## 事前に必要なもの {#prerequisites}

- `browser` ツールセット（`browser_exec`）が有効になっていること。`browser_exec` は、補助関数（`new_tab`, `goto_url`, `wait_for_load`, `page_info`, `js`, `fill_input`, `click_at_xy`, `capture_screenshot`, `cdp`）を読み込み済みの状態で Python を実行します。ブラウザの状態は呼び出しをまたいで残りますが、Python の変数は残りません。
- 利用者から渡される対象の URL と、テストの範囲

## 入力 {#inputs}

利用者が次を指定します。
1. **対象の URL** — テストの入り口になるページ
2. **範囲** — どの領域や機能に絞るか（全体を見るなら "full site"）
3. **出力先ディレクトリ**（任意） — スクリーンショットと報告書の保存先（既定: `./dogfood-output`）

## 進め方 {#workflow}

次の5段階の手順で進めます。

### 第1段階: 計画 {#phase-1-plan}

1. 出力先のディレクトリ構成を作ります:
<!-- ascii-guard-ignore -->
   ```
   {output_dir}/
   ├── screenshots/       # Evidence screenshots
   └── report.md          # Final report (generated in Phase 5)
   ```
<!-- ascii-guard-ignore-end -->
2. 利用者の指定をもとに、テストの範囲を決めます。
3. どのページと機能をテストするかを考えて、おおまかなサイトマップを作ります:
   - トップページ / ホーム
   - ナビゲーションのリンク（ヘッダー、フッター、サイドバー）
   - 主要な操作の流れ（登録、ログイン、検索、購入手続きなど）
   - フォームと操作できる要素
   - 例外的な状態（空の状態、エラーページ、404）

### 第2段階: 探索 {#phase-2-explore}

各手順の操作は、1回の `browser_exec` 呼び出しにまとめます。計画に挙げたページや機能それぞれについて、次を行います。

1. **コンソールを監視するフックを入れてから移動します。** 読み込み中に出たエラーも拾えるよう、移動する前にタブへフックを登録します:
   ```python
   # Open page with console-error capture
   HOOK = """window.__qa_errors = [];
   const _e = console.error;
   console.error = (...a) => { window.__qa_errors.push(a.map(String).join(' ')); _e(...a); };
   addEventListener('error', e => window.__qa_errors.push('uncaught: ' + e.message));
   addEventListener('unhandledrejection', e => window.__qa_errors.push('rejection: ' + String(e.reason)));"""
   new_tab('about:blank')  # first call only: the hook binds to the current tab
   cdp('Page.addScriptToEvaluateOnNewDocument', source=HOOK)
   goto_url("https://example.com/page")
   wait_for_load()
   print(page_info())
   print(js('window.__qa_errors || []'))
   ```
   あとの呼び出しでページを移動するときも、その呼び出しの最初でフックを登録し直してください。表に出ない JS エラーは価値の高い発見です。

2. **ページの構造を読み取ります** — 画面に見えている操作できる要素を、表示領域内の中心座標つきで一覧にします（役割や名前が必要なときは `cdp('Accessibility.getFullAXTree')` を使い、Python 側で絞り込みます）:
   ```python
   # List interactive elements
   print(js("""(() => [...document.querySelectorAll('a,button,input,select,textarea,[role=button]')]
     .filter(e => e.offsetParent).slice(0, 80).map((e, i) => { const r = e.getBoundingClientRect();
       return {i, tag: e.tagName, text: (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 60),
               id: e.id, name: e.name, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)}; }))()"""))
   ```

3. **ページを目で見て評価します:** `capture_screenshot()` を呼び、添付された画像で、レイアウトの崩れ、壊れた要素、アクセシビリティの問題がないかを確かめます。モデルが画像を見られない場合は、表示されたパスを `vision_analyze` に渡してください。

4. 操作できる要素を**順に試します**:
   - ボタンとリンクをクリックする: `js("document.querySelector('#submit').click()")`、または手順2で得た中心座標を使って `click_at_xy(x, y)`
   - フォームに入力する: `fill_input('input[name=email]', 'test input')`
   - キーボード操作を試す: `cdp('Input.dispatchKeyEvent', type='keyDown', key='Tab', code='Tab', windowsVirtualKeyCode=9)` に続けて対応する `keyUp` を送り、`js('document.activeElement.outerHTML.slice(0, 200)')` でフォーカスがどこへ移ったかを確かめます。Enter キーも同じ形で、`key='Enter'`, `code='Enter'`, `windowsVirtualKeyCode=13` を使います
   - 内容をスクロールする: `js('window.scrollBy(0, 800)')`
   - 前のページへ戻る: `js('history.back()')` のあとに `wait_for_load()`
   - 不正な値でフォームの検証を試す
   - 空のまま送信してみる

5. **操作するたびに**、同じ呼び出しの中で次を確認します:
   - コンソールのエラー: `print(js('window.__qa_errors || []'))`
   - 見た目の変化: `capture_screenshot()` を撮って、前のものと見比べる
   - 期待した動きと実際の動きの差（`page_info()`、または該当する要素を `js()` で読む）

### 第3段階: 証拠を集める {#phase-3-collect-evidence}

見つかった問題ごとに、次を行います。

1. 問題が写った**スクリーンショットを撮ります**: `capture_screenshot()` は保存先のパスを表示します。そのファイルを、内容がわかる名前（例: `issue-03-broken-login.png`）で `{output_dir}/screenshots/` にコピーしてください。報告書から参照します。

2. **詳細を記録します**:
   - 問題が起きた URL
   - 再現手順
   - 期待した動き
   - 実際の動き
   - コンソールのエラー（あれば）
   - スクリーンショットのパス

3. 問題の分類表（`references/issue-taxonomy.md` を参照）に沿って、**問題を分類します**:
   - 深刻度: Critical / High / Medium / Low
   - 種類: Functional / Visual / Accessibility / Console / UX / Content

### 第4段階: 整理 {#phase-4-categorize}

1. 集めた問題をすべて見直します。
2. 重複をまとめます。同じバグが別の場所で現れているものは1つにします。
3. 各問題に、最終的な深刻度と種類を割り当てます。
4. 深刻度の順に並べます（Critical、High、Medium、Low の順）。
5. 冒頭の要約用に、深刻度別・種類別の件数を数えます。

### 第5段階: 報告 {#phase-5-report}

`templates/dogfood-report-template.md` のテンプレートを使って、最終的な報告書を作ります。

報告書には次を必ず入れます。
1. **冒頭の要約**。問題の総数、深刻度別の内訳、テストした範囲
2. **問題ごとの節**。次を含めます:
   - 問題の番号と見出し
   - 深刻度と種類のバッジ
   - 確認した URL
   - 問題の説明
   - 再現手順
   - 期待した動きと実際の動き
   - スクリーンショットの参照（画像を埋め込むには `MEDIA:<screenshot_path>` を使います）
   - 関係する場合はコンソールのエラー
3. 全問題の**一覧表**
4. **テストの記録** — 何をテストし、何をテストしなかったか、途中で詰まった点

報告書は `{output_dir}/report.md` に保存します。

## ツール一覧 {#tools-reference}

ブラウザの操作はすべて `browser_exec` の呼び出しです。上で使った補助関数と書き方をまとめます。

| 操作 | `browser_exec` での書き方 |
|------|---------|
| URL を開く | 最初に一度 `new_tab(url)`（フックを登録する前なら `new_tab('about:blank')`）、以降は `goto_url(url)`。続けて `wait_for_load()` |
| ページの状態 | `page_info()` |
| DOM / アクセシビリティツリー | `js(...)` で取り出すか、`cdp('Accessibility.getFullAXTree')` を Python 側で絞り込む |
| クリック | `js("document.querySelector(sel).click()")` または `click_at_xy(x, y)` |
| 入力欄に文字を入れる | `fill_input(selector, text)` |
| スクロール | `js('window.scrollBy(0, 800)')` |
| 前のページへ戻る | `js('history.back()')` |
| キーを押す | `cdp('Input.dispatchKeyEvent', type='keyDown', key=..., code=..., windowsVirtualKeyCode=...)` + `keyUp` |
| スクリーンショット | `capture_screenshot()`（結果に画像が添付されます。テキストだけのモデルはパスを `vision_analyze` に渡します） |
| JS コンソールのエラー | `cdp('Page.addScriptToEvaluateOnNewDocument', source=HOOK)` でフックを入れ、`js('window.__qa_errors || []')` で読む |

## コツ {#tips}

- **ページを移動したあとと、大きな操作をしたあとは、必ず `window.__qa_errors` を読んでください。** 表に出ない JS エラーは、もっとも価値のある発見の1つです。
- **ひとまとまりの手順は1回の `browser_exec` 呼び出しにまとめてください**（移動、待機、取り出し、操作、エラー確認） — やり取りの回数が減り、フックも外れません。
- 要素の位置を考えたいときや、DOM から取り出した内容がはっきりしないときは、**`capture_screenshot()` を撮ってください**。`click_at_xy` には、要素の一覧で得た中心座標を渡します。
- **正しい値と不正な値の両方でテストしてください** — フォームの検証まわりのバグはよくあります。
- **長いページはスクロールしてください** — 画面の下の方の内容に表示崩れがあるかもしれません。
- **移動の流れをテストしてください** — 複数段階の処理は、最初から最後までクリックして通してみます。
- スクリーンショットに映る表示崩れを記録して、**画面幅への対応を確認してください**。
- **例外的なケースも忘れずに**: 空の状態、とても長い文字列、特殊文字、連打。
- スクリーンショットを利用者に伝えるときは `MEDIA:<screenshot_path>` を添えて、その場で見られるようにしてください。
