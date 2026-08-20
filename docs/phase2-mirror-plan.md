# winsmux-wiki フェーズ2 — 全訳ミラー + 2系統UX

> 2026-08-20 sora 指示: ①索引止まりの領域（skill 196 / developer-guide 34 / 公式全ページ）も**すべて日本語化**し「公式サイトの完全ミラーのような感じ」にする ②**初見の人と常用者で UX を分ける** ③翻訳エンジンは **Opus 5**。
> 旧 Non-goals「199 skill の手訳はしない」は sora 裁定で破棄（HANDOFF に記録する）。

## Context

現状はフェーズ1完了: 導線 + 索引3種 + concepts/entities/syntheses 14 ページ。公式 docs の実体は英語のまま。読者は「索引 → 英語ページ」で切れる。これを 402 ページ（docs 本文 206 = 3.75MB、skill 196 = 2.15MB）の日本語ミラーにし、読者の状態（これから入れる / もう使っている）ごとに別の導線で届ける。

実測済みの前提:
- 上流は `C:/Users/sorab/Documents/Projects/oss/hermes-agent` の `upstream/main:website/docs/`（MIT）
- MDX 特殊記法: `import` 行あり 28 ファイル / `:::` admonition あり 133 ファイル / `<Tabs>` 0 / `.mdx` 0。画像は `/img/...` 絶対参照、YouTube iframe が数箇所
- ナビ順の正本は `website/sidebars.ts`
- 既存資産: 自前 renderer（markdown.ts）、buildDoc + 目次自動挿入（doc.ts）、`sync-public.mjs`（/raw と llms.txt）、`sync-skills.mjs` / `gen-all.mjs`、日次 scheduled task `winsmux-wiki-sync`（07:33 JST・初回発火実証済み）

## 1. 2系統UX（初見 / 常用）

入口 `/hermes/` の2カードが既に読者を分岐している。これを「入口だけの分岐」から「別々の旅」に深める。

**初見レーン（インストールする）** — 変更最小:
- 導線 7 画面は現行のまま（公式順・手順完結）
- 各導線ページ末尾に「もっと詳しく（日本語版）」としてミラー該当ページへ 1〜3 リンク追加
- `/ops` 到達後の卒業導線「ここからは使い方へ」→ `/live`

**常用レーン（すでにインストールしている）** — `/live` を常用ホームに拡張:
- 上段: 現行の接続確認（未接続なら LINE/Telegram へ）
- 下段を新設「毎日つかう」: CLI コマンド / スラッシュコマンド / 設定 / skill 一覧 / Cron / 困ったとき（FAQ・troubleshooting）/ 更新する — すべてミラーの日本語ページへ
- **常設サイドバー（sora 指示 2026-08-20）**: lg 以上で左サイドバー常設。中身 = 導線グループ + 公式 `sidebars.ts` と同じツリーの日本語版（`data/sidebar.json` から生成、カテゴリ折りたたみ・現在ページ強調）。モバイルは現行ハンバーガーのみ。BaseLayout を lg でサイドバー + 本文の 2 カラムに
- **全文検索（Pagefind）**: 静的・自前ホスト・ビルド後インデックス生成。ヘッダに検索ボックス（モバイルはハンバーガー内）。402 ページの日本語ミラーで真価
- 再訪時: `localStorage` に前回選んだレーンを記憶し、`/hermes/` のカード強調を入替（**自動リダイレクトはしない**。情報設計の「localStorage に行き先だけ保持」の範囲内）

**共通**: guide タブ（よく使う/すべて/skill）は維持。「すべて」「skill」「developer-guide」の各行リンクを公式 URL → ミラー内日本語ページへ差し替え（公式へは各ページの「正本:」リンクで飛べる）。

## 2. ミラー基盤（/hermes/docs/）

- URL: `/hermes/docs/<上流パス>/`（1:1。例 `/hermes/docs/user-guide/features/memory/`）。正本 URL・raw パスが機械導出できる
- 原稿: `src/raw/docs/<path>.md`。frontmatter = title(訳) / description(訳) / sources(公式URL) / upstream_sha
- 状態: `data/mirror-state.json` = { path: { upstreamSha, translatedAt } } — 差分翻訳の正本
- ルート: `src/pages/hermes/docs/[...slug].astro`（import.meta.glob、既存 [slug].astro と同型）
- セクション索引と prev/next: `sidebars.ts` を素朴にパースして `data/sidebar.json` を生成 → ミラー内の並び・前後リンク・`/hermes/docs/` トップの一覧に使う
- llms.txt: sync-public.mjs がミラー全ページを機械追記

**前処理 `scripts/mirror-extract.mjs`**（決定論・翻訳前に実行）:
- `import` 行除去 / YouTube iframe → リンク行 / その他 JSX ブロック → 除去してリンク化
- 相対リンク → `/hermes/docs/...` 絶対、`/img/...` → 公式ドメイン絶対 URL
- 出力 = 素の markdown（Opus への入力）

**renderer 拡張（markdown.ts）** — 既存 27 ページを壊さないこと:
- `:::note|tip|info|warning|danger|caution [タイトル]` … `:::` → 色付きボックス
- `#### ` h4 / 画像 `![]()` / ネスト箇条書き（インデント対応）
- 拡張後、既存 27 ページの dist HTML を前後比較（差分ゼロ確認）

## 3. 翻訳パイプライン（Opus 5）

- メインセッションから `Agent(model: opus)` を段階投入。1 エージェント = 2〜3 ファイル（入力 30〜60KB）
- プロンプト固定部: 用語と禁止（語彙・です/ます）/ コマンド・設定名・コードブロックは原文維持 / 見出し構造維持 / 訳文だけ返す
- **決定論 lint `scripts/mirror-lint.mjs`**: 見出し数・コードブロック数・リンク数が原文と一致 / 禁止語 0 / frontmatter 完備 → 不一致は自動リジェクトで再翻訳
- skill 196 は安く: metadata 表・catalog はテンプレ機械変換（見出し固定訳）、本文 prose のみ Opus
- 概算: 入力 ~1.5M + 出力 ~2M トークン

**ペース配分**: 使用枠の実測に応じて分割する（今日は基盤 + パイロットのみ。本文 206 は週次リセット後に 2〜3 バッチ、skill 196 はその後段 or 日次 sync で消化）。


## 4. 日次 sync 統合

`winsmux-wiki-sync` のプロンプトを改訂: 上流差分ファイルを mirror-state と突き合わせ → 変更分だけ extract → Opus 再翻訳 → lint → build → push。skill 索引・all 索引の再生成は現行のまま。

## 5. ロールアウト（各段で deploy success + 200 実測）

1. **基盤（今日）**: renderer 拡張（回帰比較付き）/ extract / lint / ルート / sidebar.json / Pagefind / /live 拡張 / レーン記憶
2. **パイロット（今日）**: getting-started 7 ページを Opus で全訳 → sora 目視ゲート（文体・単価実測を提示）
3. **本文 206（土曜リセット後〜8/31 に 2〜3 バッチ）**: user-guide 中核 → features → messaging → guides → integrations → reference → developer-guide
4. **skill 196（本文の後 or 日次 sync で N 件/日）**: テンプレ + prose 翻訳
5. **仕上げ**: 導線・guide のリンク差し替え、`not-a-mirror` を「日本語ミラー宣言」に改稿、HANDOFF / CLAUDE.md の Non-goals 上書き記録、日次 sync プロンプト改訂

実装着手前に Sol Max の設計レビュー（`codex-sol.ps1 -Purpose design`）を通す（operator 規律 #15）。

## 変更ファイル（代表）

- 拡張: `src/lib/markdown.ts` `src/lib/doc.ts` `src/lib/pages.mjs` `scripts/sync-public.mjs` `src/components/Nav.astro` `src/raw/live.md` `src/pages/hermes/live/index.astro`
- 新規: `scripts/mirror-extract.mjs` `scripts/mirror-lint.mjs` `scripts/gen-sidebar.mjs` `src/pages/hermes/docs/[...slug].astro` `data/mirror-state.json` `src/raw/docs/**`（生成物）
- 改訂: scheduled task `winsmux-wiki-sync` プロンプト、HANDOFF.md、`src/raw/syntheses/not-a-mirror.md`

## 検証

- renderer 回帰: 拡張前後で既存 27 ページの dist HTML diff ゼロ
- lint: 構造一致 + 禁止語 0 を全訳文に機械適用
- 実画面: preview で両レーン（初見 = /hermes/→/start、常用 = /hermes/→/live→検索→ミラー）を 1280px / 375px で確認
- 公開: deploy success + 新 URL サンプリング 200 + `llms.txt` 200 維持
- パイロット後に単価（トークン/ページ）を実測報告してから全量へ

## リスク

- renderer 拡張の回帰 → 前後 diff ゲートで封じる
- Opus 消費のまとまり → ペース配分を sora 確認（下記）
- 上流の JSX 変則（import あり 28 ファイル）→ extract が除去できない構文は fail loud でリスト化し個別対応
- 翻訳品質ドリフト → lint + セクションごとに 1 ページ抜き取り目視
