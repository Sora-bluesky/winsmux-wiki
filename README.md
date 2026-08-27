# Hermes Agent Wiki

**https://wiki.winsmux.dev/** — [Hermes Agent](https://github.com/NousResearch/hermes-agent) の非公式・日本語 wiki。公式ドキュメント全ページの日本語版（毎日自動追随）に、逆引き・トラブル対処・モデルと料金などの独自ページをのせています。

Japanese mirror of the official Hermes Agent docs. Same structure, same commands, same links — only the language differs.

## これは何

公式 [Hermes Agent docs](https://hermes-agent.nousresearch.com/docs/) の全ページ（本文 200+ / skill 196、計 400 ページ超）を日本語で読めるサイトです。NousResearch とは無関係の**非公式**プロジェクトです。

- **公式完全準拠**: ページ構成・見出し・コードブロック・リンクは公式とバイト一致で揃えています（機械照合）。独自の手順は作りません。正本は常に公式 docs で、各ページの末尾からたどれます
- **毎日追随**: 上流の差分を日次で検出し、変わったページだけ再翻訳して公開します
- 独自コンテンツはトップの案内、全ページ索引、少数の概念整理ページのみ

## 構成

| パス | 中身 |
|---|---|
| `src/raw/docs/` | 翻訳済みページ（frontmatter 付き Markdown。1 上流ページ ⇔ 1 ファイル） |
| `src/pages/hermes/` | Astro ルーティング（`docs/[...slug].astro` が raw を全ページ静的生成） |
| `data/mirror-state.json` | 全ページの上流 blob SHA と翻訳状態 |
| `data/user-stories.ja.json` / `data/blueprints.ja.json` | JSX 由来ページ（User Stories / Automation Blueprints カタログ）の翻訳データ |
| `scripts/` | 同期パイプライン（下記） |

### 同期パイプライン

```text
mirror-extract.mjs   上流 → 翻訳用 Markdown 抽出・状態更新（未知の JSX は fail loud）
mirror-lint.mjs      構造照合: フェンス内容バイト一致・リンク順・アンカー列・禁止語
mirror-stories.mjs   User Stories データ（262件）の差分検出・翻訳マージ
mirror-blueprints.mjs Automation Blueprints カタログ（公式生成 JSON）への追随
aux-watch.mjs        JSX ページの殻・コンポーネントの上流変化を検知（手動対応用）
sync-skills.mjs / gen-all.mjs / gen-sidebar.mjs  索引とサイドバーの機械生成
```

翻訳は lint（構造照合）が全緑になるまで公開されません。lint が落ちたら訳文側を直します — 規則を弱めて通すことはしません。

## ビルド

```bash
npm install
npm run build
```

成果物は `dist/`（静的ファイルのみ、全文検索インデックス含む）。検索は [Pagefind](https://pagefind.app/) で、サーバー側の検索 API はありません。

## デプロイ

`main` への push で GitHub Actions が Cloudflare Workers の Static Assets へデプロイします（認証情報はリポジトリの Actions secrets）。ワーカースクリプトは置かず、静的配信のみです。カスタムドメイン `wiki.winsmux.dev` の DNS は wrangler の設定が宣言的に管理しています。

## フィードバック

訳の誤り・リンク切れは [Issues](https://github.com/Sora-bluesky/winsmux-wiki/issues) へ。ドキュメントの内容そのものへの指摘は上流の [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) が適切です。
