---
title: "Dogfood — Web アプリを探索的にテストする: バグ、証拠、報告書"
description: "Web アプリを探索的にテストする: バグ、証拠、報告書"
upstream_path: user-guide/skills/bundled/software-development/software-development-dogfood.md
upstream_blob: 953add5b009d89dd030d8db8d9f22a265f52e6e0
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

この skill は、ブラウザ用のツール群を使って Web アプリを体系的に探索テストする手順を示します。アプリの中を移動し、要素を操作し、問題の証拠を残して、構造化されたバグ報告書を作ります。

## 事前に必要なもの {#prerequisites}

- ブラウザ用のツール群が使えること（`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_vision`, `browser_console`, `browser_scroll`, `browser_back`, `browser_press`）
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

計画に挙げたページや機能それぞれについて、次を行います。

1. ページへ**移動**します:
   ```
   browser_navigate(url="https://example.com/page")
   ```

2. DOM の構造を把握するため、**スナップショットを取ります**:
   ```
   browser_snapshot()
   ```

3. JavaScript のエラーがないか、**コンソールを確認します**:
   ```
   browser_console(clear=true)
   ```
   ページを移動するたび、また大きな操作をするたびに行ってください。表に出ない JS エラーは価値の高い発見です。

4. ページを目で見て評価し、操作できる要素を把握するため、**注釈つきのスクリーンショットを撮ります**:
   ```
   browser_vision(question="Describe the page layout, identify any visual issues, broken elements, or accessibility concerns", annotate=true)
   ```
   `annotate=true` を付けると、操作できる要素に番号つきの `[N]` ラベルが重ねて表示されます。各 `[N]` は、以降のブラウザコマンドで使う ref `@eN` に対応します。

5. 操作できる要素を**順に試します**:
   - ボタンとリンクをクリックする: `browser_click(ref="@eN")`
   - フォームに入力する: `browser_type(ref="@eN", text="test input")`
   - キーボード操作を試す: `browser_press(key="Tab")`, `browser_press(key="Enter")`
   - 内容をスクロールする: `browser_scroll(direction="down")`
   - 不正な値でフォームの検証を試す
   - 空のまま送信してみる

6. **操作するたびに**、次を確認します:
   - コンソールのエラー: `browser_console()`
   - 見た目の変化: `browser_vision(question="What changed after the interaction?")`
   - 期待した動きと実際の動きの差

### 第3段階: 証拠を集める {#phase-3-collect-evidence}

見つかった問題ごとに、次を行います。

1. 問題が写った**スクリーンショットを撮ります**:
   ```
   browser_vision(question="Capture and describe the issue visible on this page", annotate=false)
   ```
   レスポンスの `screenshot_path` を控えておいてください。報告書から参照します。

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

| ツール | 用途 |
|------|---------|
| `browser_navigate` | URL を開く |
| `browser_snapshot` | DOM のテキストスナップショットを取る（アクセシビリティツリー） |
| `browser_click` | ref（`@eN`）または文字列で要素をクリックする |
| `browser_type` | 入力欄に文字を入れる |
| `browser_scroll` | ページを上下にスクロールする |
| `browser_back` | ブラウザの履歴を1つ戻る |
| `browser_press` | キーボードのキーを押す |
| `browser_vision` | スクリーンショット + AI による分析。要素にラベルを付けるには `annotate=true` |
| `browser_console` | JS コンソールの出力とエラーを取得する |

## コツ {#tips}

- **ページを移動したあとと、大きな操作をしたあとは、必ず `browser_console()` を確認してください。** 表に出ない JS エラーは、もっとも価値のある発見の1つです。
- 操作できる要素の位置を考えたいときや、スナップショットの ref がはっきりしないときは、**`browser_vision` に `annotate=true` を付けてください**。
- **正しい値と不正な値の両方でテストしてください** — フォームの検証まわりのバグはよくあります。
- **長いページはスクロールしてください** — 画面の下の方の内容に表示崩れがあるかもしれません。
- **移動の流れをテストしてください** — 複数段階の処理は、最初から最後までクリックして通してみます。
- スクリーンショットに映る表示崩れを記録して、**画面幅への対応を確認してください**。
- **例外的なケースも忘れずに**: 空の状態、とても長い文字列、特殊文字、連打。
- スクリーンショットを利用者に伝えるときは `MEDIA:<screenshot_path>` を添えて、その場で見られるようにしてください。
