# winsmux-wiki フェーズ3 — 「Hermes Agent Wiki」への昇華

> 2026-08-27 sora 指示: Teknium 無反応・先行 i18n PR の日本人アカウント存在を受け、**PR 路線から離脱**。公式ミラーの UI/UX から「ユーザー目線の付加価値 wiki サイト」へ昇華して公開する。
> sora 確定事項: ①呼称は **「Hermes Agent Wiki」**（「wiki」語彙禁止を解禁 — 旧・用語と禁止.md のこの項は本裁定で上書き）②公開ラインは**付加価値フルセット8本**。

## Context

現状 = 402ページの日本語ミラー + 日次自動追随（6日連続無人完走）+ 検索/サイドバー/OG。これは「基盤」としては完成だが、調査の結論は一致して**「翻訳ミラーそのものは選ばれる理由にならない」**:
- 世界の優良 wiki の核 = 公式が書けないもの（逆引き・トラブル事例・データ表・段階導線・鮮度可視化）〔Arch Wiki / MDN / minecraft.wiki / HA Blueprints / Obsidian Hub 調査〕
- 日本語圏で効く型 = 逆引き早見・つまずき表・意思決定直結ページ（料金/比較）・初心者専用導線・非公式明示の信頼設計〔Game8 / としあきWiki / rsdocsjp / Qiita 人気まとめ調査〕
- Hermes 実需（一次情報）= 料金試算・Claude Code 乗り換え判断・ゲートウェイ接続トラブル・**日本語入力問題（Issue #40219 ほか）**・体系的日本語チュートリアルの空白〔GitHub issues / Zenn / Qiita / note 調査〕

当サイト固有の武器 = **毎日自動更新される 402 ページの日本語コーパス + その差分ログ**。付加価値層はこの上に載せ、可能な限り自動追随に接続する。

## 1. ポジショニング

- 名称: **Hermes Agent Wiki**（サブ: 非公式・日本語）。`<title>`・OG・README・トップ H1 まわりを改称。非公式明示3点セット（トップ導入文/全ページフッター/README）は維持
- 構造 = **ミラー層（既存・自動）+ Wiki 層（新設・付加価値）**。Wiki 層のページには「このページはこのサイト独自の解説です」の帯 + 出典リンクを必ず付ける（rsdocsjp 型の信頼設計）
- 語彙ルール改定: 「wiki」解禁。その他の旧禁止語（はじめる/編む/暮らす/入れところ/リファレンス/複数台/fleet）は維持し、mirror-lint の FORBIDDEN から `wiki` 項のみ削除

## 2. Wiki 層コンテンツ（公開ライン8本）

データは `data/wiki/*.json` + 専用 Astro ページ（stories/blueprints パイプラインの既存パターン踏襲）。生成は Opus サブエージェント（Fable 不使用・継続）、事実系は一次ソース裏取り必須。

| # | ページ | 中身 | データ源 / 更新 |
|---|---|---|---|
| 1 | **初めての方へ** `/hermes/first/` | 全機能を見せない段階式（①入れる→②話す→③スマホから→④任せ方、各3-5歩+次の一歩だけ）。としあきWiki型 | ミラー quickstart 系へのリンク編成。手動（安定領域） |
| 2 | **逆引き** `/hermes/howto/` | 「〜したい」→ 最短手順+該当ミラーページ。50項目前後・カテゴリ別（導入/接続/自動化/モデル/安全/運用） | Opus がミラー全ページから抽出→sora レビュー。sync が対象ページ変更時に該当項目を stale 表示 |
| 3 | **トラブルDB** `/hermes/trouble/` | 症状→原因→対処の表。初期 ~30件（guides/troubleshooting + FAQ + GitHub issues 頻出 + 日本語圏のつまずき） | issues mining を週次で sync task に追加（新規頻出を候補提示→sora 採否） |
| 4 | **料金と実例** `/hermes/cost/` | プロバイダ×モデルの費用構造早見・使い方別の目安試算・無料構成（Ollama）。全数値に一次ソース＋取得日 | 手動+月次価格確認を sync task に追加。既存 syntheses/cost-and-model を吸収改稿 |
| 5 | **Claude Code からの乗り換え** `/hermes/from-claude-code/` | 事実ベース比較表（概念対応: skills/hooks/memory/cron の対応関係・無いもの）+ 移行手順（公式 import-from-other-agents へ接続） | 手動。両製品の公式 docs のみを出典に |
| 6 | **日本語入力と日本語化の現在地** `/hermes/japanese/` | IME 問題（Issue #40219/#40446）の状態・回避策、i18n 実装状況（PR #20231/#40114 の範囲）、display.language 設定 | issue 状態を週次 sync で追跡（状態変化を報告） |
| 7 | **今週の更新** `/hermes/updates/` | 上流差分の日本語ダイジェスト（週単位）。トップに最新3件掲出 | **全自動**: 日次 sync が既に持つ差分情報を `data/wiki/updates.json` に追記→週次で Opus が1段落要約 |
| 8 | **skill 用途別さがし** `/hermes/guide/skills/` 改修 | 既存196件索引に用途タグ（15分類程度）+「この用途ならこの3つ」推し枠を追加 | タグは Opus 一括分類→sora 精査。新 skill は sync が未分類として提示 |
| 9 | **モデルと料金の一覧** `/hermes/models/`（08-27 sora 追加指示: Portal /models のミラー） | Portal 掲載の全 372 モデル（TEXT 329 / EMBEDDINGS 33 / OTHER 10）の表: Portal 価格・定価・割引率・無料枠・コンテキスト長・モダリティ。促販枠（80% OFF 等）も表示。検索/フィルタ付き | **実測済みの公開 API** `https://inference-api.nousresearch.com/v1/models`（200・660KB・372件・pricing に portal 価格と `original`=定価、Vercel チャレンジなし）。blueprints と同型の curl 追随パイプライン `scripts/mirror-models.mjs` + `data/portal-models.ja.json`。日次 sync に組込み（価格・件数の差分検知）。説明文の和訳は初回 Opus 一括 + 差分再訳 |
| 10 | **コミュニティの動き** `/hermes/community/`（08-27 sora 提案: Discord 英語コミュニティの差分を日本語で） | 公式 Discord の対象チャンネル（developers / hermes-agent / community-projects-showcase / plugins-skills-and-skins）の新着を週次で日本語ダイジェスト。**要約+アーカイブへのリンク**の形（メンバー発言の全文転載・長い引用はしない） | **データ源 = `teknium1/nous-discord-archive`**（sora 発見・08-27 実測確認: maintainer 本人が運用する公開リポ。6時間ごとに GitHub Actions で対象チャンネルを append-only の txt へアーカイブ、state.json で増分管理）。当方は bot 不要 — 週次で `gh api compare` の差分→Opus 要約。**実測の注意**: 上流の収集は 08-18 以降 failure 連発で停止中（08-26 の3 run すべて失敗・最終データ 08-18）。ページに「アーカイブ最終更新日」を必ず表示し、上流停止時は自然に鮮度表示が止まる設計（当方 sync は「差分なし」を正常系として扱う） |

- #9 は sora 指示によりローンチ必須に追加。#10 もアーカイブリポ由来で完全自動化できるため**ローンチ組に含めることを推奨**（08-18 までのデータで初回ダイジェストを作れる。公開ライン = 8本 + #9 + #10）
- 既存の concepts/entities/syntheses は Wiki 層へ吸収（cost-and-model→#4、他はしくみ解説として残置・帯付与）。#4 の価格データは #9 のパイプラインを一次ソースに使う

## 3. UI 再設計（Claude Design + DesignSync 連携 — 実在確認済み）

**確認済みの前提**: `DesignSync` ツールは本環境で動作（claude.ai ログイン連携・list_projects 応答を実測）。**連携はプロジェクト単位で汎用** — `create_project` でリポごとに専用のデザインシステムプロジェクトを作れる。既存の「winsmux Design System」は別プロダクトのものなので**流用しない**。

ワークフロー（sora 引用の公式手順どおり）:
1. **デザインシステム新規作成・同期**: DesignSync の `create_project` で **「Hermes Agent Wiki」専用プロジェクト**を新規作成し、**このサイト自身の実トークン**（現行サイトの配色/タイポ/コンポーネント = BaseLayout/Nav/Sidebar 由来 + hermes ロゴ）を部品として登録。以後このリポの UI 作業は常にこのプロジェクトと同期（他のどのプロジェクトでも同じ手順で各自の design プロジェクトを持てる汎用の型）
2. **キャンバス2案ドラフト**（design スキル・既存部品から組む）:
   - 案A「ポータル型」: トップ = 検索前面 + 逆引き玄関（やりたいこと chips）+ 今週の更新フィード + レベル別カード + Wiki 層タイル（Game8/Arch 的密度）
   - 案B「docs+型」: 現行ドキュメント調を保ち Wiki 層セクションを漸進追加
   - 共通: 「Hermes Agent Wiki」ヘッダー・最終更新/上流追随バッジ・Wiki 層の「独自解説」帯。主要ページ（トップ/逆引き/トラブルDB）+ モバイル幅も各案に含める
3. **sora が Claude Design 上で直接編集・選択**（ビジュアル編集・保存で新版が publish される）
4. **コードへの引き渡し**: 確定キャンバスの .dc.html を読み、スクリーンショット経由でなく**既存作業から継続**して Astro 実装
- 任意: ターミナルから直接編集したい場合は Claude Design MCP を登録（`claude mcp add --scope user --transport http claude-design https://api.anthropic.com/v1/design/mcp` → sora が `/design-login`）。承認後に希望があれば実施

## 4. 機構・運用

- 新スクリプト: `scripts/wiki-updates.mjs`（sync 差分→updates.json 追記+週次要約）/ `scripts/issues-mine.mjs`（週次・gh api で頻出 issue 候補抽出→報告のみ）/ `scripts/mirror-models.mjs`（#9: inference-api /v1/models へ curl 追随・形状チェック fail loud・blueprints 同型）/ `scripts/community-digest.mjs`（#10: nous-discord-archive の週次差分→Opus 要約素材の抽出）。いずれも fail loud・報告型（自動公開はダイジェストと #9 の数値のみ）
- lint: Wiki 層は mirror-lint 対象外。禁止語（wiki 除外後）+ dist 全リンク検査 + 出典必須チェック（wiki ページに sources 無しなら build fail）を追加
- sync task prompt 改訂: 週次ジョブ（updates 要約・issues mining・価格確認・skill 新規分類）を金曜に追加実行
- 告知（X/Substack・humanizer 経由）は 8本+新トップ公開後に sora が実施

## 5. ロールアウト

1. **UI ドラフト**: DesignSync で部品同期 → Claude Design キャンバス2案 → sora が Design 上で編集・選択（ここで一旦停止）→ 確定 .dc.html から実装継続
2. **基盤改修**: 改称（title/OG/README/ヘッダー）・語彙ルール改定・更新日バッジ・Wiki 層ページ枠 + data パイプライン
3. **コンテンツ生成**: #7(自動)→#2/#3/#8(Opus 生成+sora レビュー)→#1/#4/#5/#6(執筆・事実裏取り)。料金/比較/日本語化ページは公開前に一次ソース再検証（Sol 事実検証を通す）
4. **新トップ実装** → 実画面検証（1920/1632/375）→ 公開 → 告知支度
- 使用量: 生成は Opus サブエージェント。概算 = 逆引き50+トラブル30+タグ分類196+要約で 100〜150万 tok 級（フェーズ2の 1/10 以下）

## 6. 変更ファイル（代表）

- 改称/枠: `src/layouts/BaseLayout.astro` `src/components/Nav.astro` `src/raw/index.md` `README.md` `public/og.png`（文言差替の再生成）
- 新規: `src/pages/hermes/{first,howto,trouble,cost,from-claude-code,japanese,updates}/index.astro` + `data/wiki/*.json` + `scripts/wiki-updates.mjs` `scripts/issues-mine.mjs`
- 改修: `scripts/mirror-lint.mjs`（wiki 解禁）/ `scripts/sync-skills.mjs`（用途タグ）/ scheduled task prompt / `src/raw/syntheses/cost-and-model.md`（#4 へ吸収）

## 7. 検証

- 既存回帰: 427+新規ページ build / dist 全リンク検査 broken 0 / 禁止語（改定後）0 / ミラー層 lint 全緑維持
- 事実検証: 料金・比較・日本語化ページは公開前に一次ソース URL 突合（Sol 検証）。GitHub star 数等メディア由来の数値は使わない（調査で 22k〜237k の食い違いを実測）
- 実画面: 新トップ・逆引き・トラブルDB を 1920/1632/375 で確認。deploy success + サンプル 200 + llms.txt 200

## リスク

- 事実系ページ（料金・比較）の陳腐化 → 取得日明記 + 月次確認を sync に組込み
- 逆引き/トラブルの品質ばらつき → 初期は件数を絞り sora レビューゲート必須
- 名称変更による既存 OG/ブックマークの混乱 → URL は不変・OG 画像のみ文言差替
