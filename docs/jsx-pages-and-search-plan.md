# user-stories / blueprint カタログの日本語化 + 検索モーダル

## Context

wiki.winsmux.dev は公式 docs 全399ページの日本語ミラーだが、JSX を含む2ページだけ例外扱いになっている:

- **User Stories**（コミュニティの声 262件のコラージュ）— サイドバーから公式へ外部リンク。sora 指摘「公式に飛ぶだけでは日本人ユーザーはわからない。このサイトの存在意義がない」
- **Automation Blueprints カタログ**（16件の自動化ひな形）— サイドバーから**無言で欠落**（外部リンクすらない。調査で判明）

調査の結果、2ページとも「MDX の殻 + 実データは別ファイル」構造で、実データは現行の blob 監視（`website/docs/` 配下限定）の**射程外**:

| ページ | 実データ | 所在 | 更新頻度 |
|---|---|---|---|
| user-stories | `userStories.json`（262件・約162KB。headline/quote が英語自然文） | `website/src/data/` | 高（116件追加等、継続増加中） |
| blueprints カタログ | `cron/blueprint_catalog.py` の CATALOG 16件 → ビルド時に `website/scripts/extract-automation-blueprints.py` が `/docs/api/automation-blueprints-index.json` を生成 | **本体コード**（docs 外） | 中（skill 追加のたび） |

あわせて sora 要望: **その場で開く検索ウィンドウ**（現状はヘッダー 🔍 → `/hermes/search/` へページ遷移のみ）。

方針は既存裁定を維持: 公式完全準拠（構成・コード・リンクはバイト一致）/ 翻訳は Opus サブエージェントのみ / assets-only（Worker 追加なし）/ 二重管理ゼロ。

## 設計判断（決め打ち・承認対象）

1. **2ページは md ミラーパイプラインに乗せず「データ駆動の専用 Astro ページ」にする**。mirror-extract の除外2行は残す（1 md ⇔ 1 訳ファイルのモデルに JSX は乗らない）。代わりに専用 sync スクリプト + 専用 state で追随する
2. **user-stories の quote/headline は日本語のみ表示**。各カードに元ポスト URL があり原文へ1クリックで到達できるため併記しない（コラージュの密度を守る）
3. **blueprint の `prompt_template` / `schedule_template` は英語原文のまま**（コードフェンス相当 = バイト一致原則）。title / description / slot の label・help だけ翻訳
4. **blueprint データの取得元は公式サイトの生成物** `https://hermes-agent.nousresearch.com/docs/api/automation-blueprints-index.json`（curl + 形状チェック）。Python 実行や本体コードのパースを持ち込まない。公開されている公式の正本に追随する
5. **検索は全ページ共通のモーダル**（🔍 クリック / Ctrl+K / Esc）。中身は既存 Pagefind UI を遅延ロードで再利用。`/hermes/search/` ページは deep-link 用に現状維持

## 実装

### A. user-stories ページ（新規 5 ファイル程度）

1. `scripts/mirror-stories.mjs` — `git show upstream/main:website/src/data/userStories.json` を読み、`data/stories-state.json`（id → headline+quote のハッシュ + status）と突き合わせ、新規・変更分だけを `.mirror/en/stories/batch-*.json` に書き出す。`--check` は件数報告のみ。id 消滅は訳データからも削除
2. `.mirror/CONTRACT-STORIES.md` — 翻訳契約: JSON in/out、訳すのは headline / quote のみ、他フィールド（author/url/date/category/size/source）はバイト一致、禁止語適用、口語の声らしさを保つ
3. 翻訳: **Opus サブエージェント**（30件/体 × 約9体）→ `data/user-stories.ja.json`（全262件、`headline` `quote` が日本語になった完全形）
4. `scripts/stories-lint.mjs` — id 集合が上流と一致 / 非翻訳フィールドがバイト一致 / URL 無改変 / 禁止語 0。**全緑まで translated にしない**
5. `src/pages/hermes/docs/user-stories/index.astro` — コラージュを Astro で静的レンダリング（React 不要）。上流 `UserStoriesCollage/index.tsx`(312行) のカテゴリ定数・カードレイアウトを移植し、カテゴリラベルは日本語化。カテゴリフィルタは既存流儀のインライン `<script>`。frontmatter 相当: タイトル「ユーザーストーリーと活用事例」、正本リンク = 公式ページ（既存ページと同じ sources 形式）
6. `src/components/Sidebar.astro` — `EXTERNAL['user-stories']`（外部リンク）を内部リンク `/hermes/docs/user-stories/` に変更（`INTERNAL_EXTRA` マップとして `automation-blueprints-catalog` と共通化）

### B. blueprints カタログページ（新規 4 ファイル程度）

1. `scripts/mirror-blueprints.mjs` — 公式 JSON を fetch → 形状チェック（key/title/description/slots の存在。崩れたら fail loud・state 不更新）→ `data/blueprints-state.json`（key → ハッシュ）と突き合わせ、差分だけ抽出
2. `.mirror/CONTRACT-BLUEPRINTS.md` — 翻訳契約: title / description / category 表示名 / slots[].label / slots[].help のみ翻訳。prompt_template / schedule_template / key / tags はバイト一致
3. 翻訳: Opus 1体（16件）→ `data/blueprints.ja.json`
4. `src/pages/hermes/docs/reference/automation-blueprints-catalog/index.astro` — mdx 殻のプレーン部分（導入文・「Writing your own」節。約20行）を訳して直書き + カタログ 16件をカード表示。`creating-skills` への相対リンクはサイト内リンクに。正本リンク = 公式ページ
5. mdx 殻の訳文は少量なのでページ内に持つが、**殻の上流 blob SHA をページ frontmatter コメントと state に記録**（追随の判定材料）

### C. 更新追随（scheduled task `winsmux-wiki-sync` の拡張）

SKILL.md / task prompt に手順を追加:

- 既存 step 3 の後に: `node scripts/mirror-stories.mjs --check` と `node scripts/mirror-blueprints.mjs --check`
- 差分あり → 各 CONTRACT を読ませた Opus で差分のみ翻訳 → lint 全緑 → コミットに含める
- **殻・コンポーネントの変化は報告のみ**（自動追随しない）: `website/docs/user-stories.mdx` / `reference/automation-blueprints-catalog.mdx` / `UserStoriesCollage/index.tsx` / `AutomationBlueprintsCatalog/index.tsx` の blob SHA を `data/aux-state.json` で監視し、変わったら sync 報告に「レイアウト変更あり・手動対応」と明記（初版以来ほぼ動いていない層。自動で追うと壊す）
- blueprint fetch 失敗（非200・形状不一致）は state 不更新 + 報告（三段防御の型どおり）

### D. 検索モーダル（全ページ）

1. `src/components/SearchModal.astro`（新規） — オーバーレイ + 入力欄。初回オープン時に `/pagefind/pagefind-ui.css` と `/pagefind/pagefind-ui.js` を動的ロードして `new PagefindUI({ element: ... })`。既存 `/hermes/search/` の日本語文言・設定を踏襲。Esc / 背景クリックで閉じる。Ctrl+K（mac: ⌘K）で開く
2. `src/components/Nav.astro` — 🔍 のリンク先遷移をモーダル起動に変更（JS 無効時のフォールバックとして href は `/hermes/search/` のまま残す）。モバイルメニューの「検索」も同じ挙動
3. `src/layouts/BaseLayout.astro` — SearchModal を組み込み（全427+2ページに載る）

### E. 後始末

- `data/mirror-state.json` から deleted 2 エントリを除去（mirror-extract の除外コメントに新パイプラインへの参照を追記）
- `src/raw/all.md` の user-stories 行が生きたリンクになることを確認（既に `/hermes/docs/user-stories/` を指している）
- HANDOFF.md の「deleted 2 は既知」節を新機構の説明に差し替え

## 実行順

1. スクリプト + 契約書 + state（A1-2, B1-2）→ 翻訳 Opus 投入（A3, B3。初回 ~10体）→ lint（A4）
2. ページ実装（A5-6, B4-5）→ ローカル build（429ページ・リンク切れ0・禁止語0）
3. 検索モーダル（D）→ Browser pane で実画面検証（モーダル開閉・検索ヒット・Ctrl+K・モバイル幅）
4. コミット（機能ごとに分割: stories / blueprints / search）→ push → deploy success + llms.txt 200 + 新2ページの HTTP 200 実測
5. scheduled task prompt 更新（C）+ HANDOFF 更新（E）

## 検証

- `node scripts/stories-lint.mjs` 全緑（262件）/ blueprints 形状チェック緑（16件）
- `npm run build` 429ページ / dist リンク検査 broken 0 / 禁止語 sweep 0
- 公開後: `/hermes/docs/user-stories/` と `/hermes/docs/reference/automation-blueprints-catalog/` が 200、サイドバーに両ページが内部リンクで出る
- 検索モーダル: トップと任意の docs ページで Ctrl+K → 「cron」等で結果が出る → Esc で閉じる（Browser pane スクリーンショット添付）
- 翌朝の sync run が新スクリプトの --check を通ること（差分ゼロなら報告のみ）

## 規模感

- 初回翻訳: 約162KB（262件）+ 16件 = Opus サブエージェント約10体（フェーズ2全訳の1/10以下）
- 新規ファイル約11、既存変更4（Nav / BaseLayout / Sidebar / mirror-state）+ task prompt
