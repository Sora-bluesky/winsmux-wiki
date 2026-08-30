# wiki + ダッシュボード改善計画（引用される力・指名される力）

## Context

LLMO 分析（2026-08-30 sora 提示）の結論は「SEO は維持しつつ、①AI の答えに引用される力 ②名前で指名される力 の2層を足す」。wiki.winsmux.dev は既に llms.txt が8日で93回読まれ、サイトマップ公開当日に ClaudeBot が436回巡回するなど「AI に見つかる」側は動き始めている。足りないのは (a) AI が抜き出せる形の結論・数字・出典の整備 (b) エンティティ（「そら」）の一貫した提示 (c) 「言及されたか・引用されたか・指名されたか」を測る計測。この3つを、既存制約（公式完全準拠・独自手順を作らない・assets-only・二重管理ゼロ）の内側で実装する。

分析の「やらないこと」も採用する: llms.txt への追加投資はしない（既に機能している現状維持のみ）、AI 専用チャンキング・不自然な短文量産はしない、ミラー本文には手を入れない。

## 全体像（3フェーズ・優先順）

| フェーズ | 中身 | 分量 |
|---|---|---|
| 1（即日） | 独自ページの「要点」統一・エンティティ固定・参照元の AI 分類 | 小 |
| 2（9/2 火・GSC データ到着後） | GSC API パネル（検索クエリ・指名検索率）+ Bing 目視手順 | 中 |
| 3（フェーズ2の後） | JSON-LD 構造化データ・AI 言及モニタの週次ルーティン | 中 |

---

## フェーズ1: 引用される形と名前の固定（wiki 側・小）

### 1-1. 独自ページ冒頭の「要点」ブロック統一

チェックリスト1「冒頭200字で結論を言い切る」を、ミラー以外の独自ページ（逆引き・トラブル・モデルと料金・日本語・乗り換え・料金と実例・コミュニティ）に適用する。

- `src/components/` に `KeyPoints.astro`（要点1〜3行 + データの取得日/件数を明示する小ブロック）を新設し、各独自ページの h1 直下に置く
- 文面は「数字 + 固有名 + 日付」で書く（例: 逆引き「全56項目。カタカナ・全角でも検索が当たる」/ models「351モデル・毎日 Portal 公開 API から取得」）。既存リード文の言い換えではなく、AI がそのまま引用できる1文に絞る
- 生成 raw md（`scripts/gen-raw-data.mjs`）にも同じ要点を先頭に出す（画面と raw の二重管理にならないよう、要点文字列は各ページの frontmatter/定数から両方へ渡す。models 等データ駆動ページは gen-raw-data.mjs 内の定数を単一ソースにする）

### 1-2. エンティティ「そら」の固定文言

- `/hermes/about/`（`src/pages/hermes/about/index.astro`）に、毎回同じ言葉で書く自己記述を1ブロック追加 + sameAs 相当のリンク（X / GitHub Sora-bluesky）
- **文面はドラフトを sora に見せて承認を得てから push する**（プランの文言はあくまで仮。humanizer-ja を通した案を複数提示 → 選定 → 反映の順）。フェーズ3の JSON-LD `Person` にも同じ承認済み文言を使い回す
- フッター（`BaseLayout.astro`）の管理人表記が「そら」で統一されているか確認し、揺れがあれば直す（公開表記ルール: ひらがな「そら」、ローマ字は出さない）

### 1-3. 参照元パネルの AI 分類（dashboard・小）

- `tools/live2/server.py` の `REF_LABEL` を拡張し、AI チャット由来の referrer（chatgpt.com / claude.ai / gemini.google.com / perplexity.ai / copilot.microsoft.com）を「AI チャット経由」グループとして色分け・集計
- `index.html` の参照元パネルに「AI 経由」小計行を追加。これで「AI の答えからの実訪問」が日次で見える（分析の"足す指標"の1つ目）

---

## フェーズ2: 検索と指名の計測（dashboard・中・9/2 以降）

### 2-1. Search Console API パネル

- 認証: Google Cloud でサービスアカウント作成 → GSC の「設定 > ユーザーと権限」に閲覧者として追加（sora 作業・手順書きを提示）。キー JSON は 1Password `AI-Provider-Keys` に保管し `op run` 注入（平文永続化なし）
- `tools/live2/server.py` に Search Analytics 取得を追加（1時間サイクル）: ①検索クエリ Top10（clicks/impressions/CTR/position）②**指名検索率** = クエリに winsmux / そら を含む割合 ③クリックされたページ Top5
- `index.html` に「Google 検索」パネル新設。並走表（古い指標 vs 足す指標）のうち「指名検索」「引用率（出典 URL に入ったか）」をここで拾う

### 2-2. Bing / AI Performance の定点観測（自動化しない）

- Bing Webmaster の AI Performance（Citation Share = ChatGPT/Copilot への引用）は API が無いベータ機能のため、**週1の型D（金曜）ワークフローに「AI Performance のスクショを1枚保存」を1行追加**するだけにする（`~/.claude/scheduled-tasks/winsmux-wiki-sync/SKILL.md` の週次節に追記）。数値は timeline.md に手書き1行

---

## フェーズ3: 構造化データと AI 言及モニタ（中）

### 3-1. JSON-LD 構造化データ（BaseLayout 一箇所）

Google 公式の「通常の良い SEO」の範囲で、AI ハックではない標準スキーマだけを入れる:

- `BaseLayout.astro` の head に JSON-LD を追加: 全ページ `WebSite` + `BreadcrumbList`（既存パンくず変数 `crumbs` を再利用）、about ページのみ `Person`（そら・sameAs: X/GitHub）
- `trouble` ページに `FAQPage`（症状=質問・対処=回答。データは既存 `data/wiki/trouble.json` から生成 = 二重管理なし）
- リッチリザルトテスト（https://search.google.com/test/rich-results）で検証してから push

### 3-2. AI 言及モニタ（チェックリスト5「月1で AI に聞く」の機構化）

- 新規 scheduled task `ai-mention-probe`（**週1・金曜 sync 後**。月1では変化が遅すぎ、毎日は無駄）
- 固定質問セット（例:「Hermes Agent を日本語で学べるサイトは」「Hermes Agent の料金一覧はどこで見られる」「Hermes Agent のトラブル対処の情報源」等5問）を、手元 CLI で回せる3系統に投げる: Grok（`grok -p`）/ Gemini（`agy -p`）/ Codex（`codex exec`・ChatGPT 系）
- 判定は機械的に: 回答テキストに `wiki.winsmux.dev` / 「そら」/ 競合ソース名が含まれるかを記録 → `evidence/ai-mentions.jsonl` に {date, engine, question, cited, named, top_sources} で追記
- ダッシュボードに「AI 言及」パネル（直近4週の cited 率の推移）。**注意: 各 CLI の回答は本物の検索型 AI（AI Overview 等）の代理指標**であることをパネル注記に明示する（過大解釈防止）

---

## やらないこと（明記）

- ミラー本文（docs 配下）への加筆・AI 向け書き換え（公式準拠の維持が最優先）
- llms.txt の拡張・AI 専用ページの新設（現状で読まれており、追加投資に根拠なし）
- `/hermes/` 以外への SEO ハック的ページ量産
- Google AI Overview の自動スクレイピング（BAN リスク・NG 行動 #5）

## 変更ファイル一覧（主なもの）

- フェーズ1: `src/components/KeyPoints.astro`（新規）、独自ページ7本、`scripts/gen-raw-data.mjs`、`src/pages/hermes/about/index.astro`、`tools/live2/server.py` + `index.html`
- フェーズ2: `tools/live2/server.py` + `index.html`、`winsmux-wiki-sync` SKILL.md（週次節1行）
- フェーズ3: `src/layouts/BaseLayout.astro`（JSON-LD）、`~/.claude/scheduled-tasks/ai-mention-probe/`（新規）、`tools/live2/`

## 検証

- wiki 側: ローカル build 緑 → mirror-lint rc=0（禁止語の機械検知を要点文にも通す）→ deploy success → 本番 URL で要点ブロック・JSON-LD を curl 実測 → リッチリザルトテストで構造化データ合格
- dashboard 側: server.py 再起動 → data.json に新キー（ai_refs / gsc / mentions）が実データで着地するのを確認 → 右ペインのスクリーンショットで表示確認
- ルーティン: `ai-mention-probe` は初回を有人で1回実走し、jsonl の形と判定の妥当性を目視してから定時化（存在の確認と作動の確認は別）
- 完了後: 本計画を `docs/llmo-improvement-plan.md` としてリポにも保存（Plan Mode 恒久化ルール）

## 補足（採用しなかった案）

- FAQPage を全ミラーページに入れる案: ミラーは公式構造とバイト一致が正で、構造化データ注入はビルド層でも lint との整合コストが高い。独自ページ限定とした
- X フォロワー等「直接オーディエンス」計測のダッシュボード統合: X API の費用・BAN リスクに対し得るものが薄い。型A〜D 連載の運用実績（type-a-ledger）で代替
