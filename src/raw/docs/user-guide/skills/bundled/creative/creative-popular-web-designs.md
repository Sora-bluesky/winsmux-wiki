---
title: "Popular Web Designs — 実在する 54 のデザインシステム（Stripe、Linear、Vercel）を HTML/CSS で"
description: "実在する 54 のデザインシステム（Stripe、Linear、Vercel）を HTML/CSS で"
upstream_path: user-guide/skills/bundled/creative/creative-popular-web-designs.md
upstream_blob: 5352e475029381e10a0c0768f5ff294994b37304
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-popular-web-designs
---

# Popular Web Designs {#popular-web-designs}

実在する 54 のデザインシステム（Stripe、Linear、Vercel）を HTML/CSS で。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/popular-web-designs` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent + Teknium（デザインシステムの出典は VoltAgent/awesome-design-md） |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |

## 早見表: SKILL.md の全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Popular Web Designs {#popular-web-designs}

HTML/CSS を生成するときにそのまま使える、実在する 54 のデザインシステムです。どのテンプレートも、そのサイトの視覚言語をまるごと写しとっています。配色、文字の階層、部品のスタイル、余白の体系、影、画面幅への対応、そして具体的な CSS の値まで書いたエージェント向けのプロンプトが入っています。

## 関連するデザイン skill {#related-design-skills}

- **`claude-design`** — デザインの*進め方と目利き*に使います（依頼の輪郭を決める、
  案を複数出す、手元の HTML 成果物を確かめる、AI くさいデザインを避ける）。
  よく知られたブランド風に、しっかり設計したページを求められたときは、この skill と
  組み合わせてください。`claude-design` が進行を受け持ち、この skill が視覚の語彙を供給します。
- **`design-md`** — 成果物が、描画されたものではなく DESIGN.md というトークン仕様の
  ファイルである場合に使います。

## 使い方 {#how-to-use}

1. 下のカタログからデザインを 1 つ選びます
2. 読み込みます: `skill_view(name="popular-web-designs", file_path="templates/<site>.md")`
3. HTML を生成するときに、そのデザイントークンと部品の仕様を使います
4. `generative-widgets` skill と組み合わせ、cloudflared のトンネル経由で結果を配信します

どのテンプレートにも、先頭に **Hermes Implementation Notes** のブロックがあり、次が書かれています。

- CDN で使える代替フォントと、貼り付けるだけの Google Fonts の `<link>` タグ
- 本文用と等幅用の CSS font-family の指定
- HTML の作成には `write_file` を、確認には `browser_vision` を使うという念押し

## HTML 生成の型 {#html-generation-pattern}

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <!-- Paste the Google Fonts <link> from the template's Hermes notes -->
  <link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">
  <style>
    /* Apply the template's color palette as CSS custom properties */
    :root {
      --color-bg: #ffffff;
      --color-text: #171717;
      --color-accent: #533afd;
      /* ... more from template Section 2 */
    }
    /* Apply typography from template Section 3 */
    body {
      font-family: 'Inter', system-ui, sans-serif;
      color: var(--color-text);
      background: var(--color-bg);
    }
    /* Apply component styles from template Section 4 */
    /* Apply layout from template Section 5 */
    /* Apply shadows from template Section 6 */
  </style>
</head>
<body>
  <!-- Build using component specs from the template -->
</body>
</html>
```

ファイルは `write_file` で書き、`generative-widgets` の流れ（cloudflared のトンネル）で配信し、
見た目が正しいかどうかを `browser_vision` で確かめます。

## フォント代替の早見表 {#font-substitution-reference}

多くのサイトは独自フォントを使っていて、CDN からは手に入りません。そこで各テンプレートには、
そのデザインらしさを保てる Google Fonts の代替を割り当てています。よくある対応は次のとおりです。

| 独自フォント | CDN の代替 | 性格 |
|---|---|---|
| Geist / Geist Sans | Geist（Google Fonts にあります） | 幾何学的で、字間が詰まっています |
| Geist Mono | Geist Mono（Google Fonts にあります） | すっきりした等幅。合字あり |
| sohne-var（Stripe） | Source Sans 3 | 細さから生まれる上品さ |
| Berkeley Mono | JetBrains Mono | 技術寄りの等幅 |
| Airbnb Cereal VF | DM Sans | 丸みのある、親しみやすい幾何学 |
| Circular（Spotify） | DM Sans | 幾何学的で、あたたかい |
| figmaSans | Inter | すっきりしたヒューマニスト |
| Pin Sans（Pinterest） | DM Sans | 親しみやすく、丸い |
| NVIDIA-EMEA | Inter（またはシステムの Arial） | 工業的で、すっきり |
| CoinbaseDisplay/Sans | DM Sans | 幾何学的で、信頼感がある |
| UberMove | DM Sans | 太く、詰まっています |
| HashiCorp Sans | Inter | 企業向けで、中立的 |
| waldenburgNormal（Sanity） | Space Grotesk | 幾何学的で、やや細身 |
| IBM Plex Sans/Mono | IBM Plex Sans/Mono | Google Fonts で使えます |
| Rubik（Sentry） | Rubik | Google Fonts で使えます |

テンプレートの CDN フォントが元と同じ場合（Inter、IBM Plex、Rubik、Geist）、置き換えによる
損失はありません。代替を使う場合（Circular に DM Sans、sohne-var に Source Sans 3）は、
テンプレートの太さ・大きさ・字間の値を忠実に守ってください。特定の書体そのものより、
そちらのほうが視覚的な個性を強く担っています。

## デザインのカタログ {#design-catalog}

### AI と機械学習 {#ai-machine-learning}

| テンプレート | サイト | 作風 |
|---|---|---|
| `claude.md` | Anthropic Claude | あたたかいテラコッタの差し色、すっきりした編集的なレイアウト |
| `cohere.md` | Cohere | 鮮やかなグラデーション、データの詰まったダッシュボード風 |
| `elevenlabs.md` | ElevenLabs | 暗く映画的な UI、音の波形を思わせる表現 |
| `minimax.md` | Minimax | 大胆な暗い画面にネオンの差し色 |
| `mistral.ai.md` | Mistral AI | フランス的に設計されたミニマリズム、紫がかった色調 |
| `ollama.md` | Ollama | ターミナル優先、モノクロームの簡素さ |
| `opencode.ai.md` | OpenCode AI | 開発者に寄せた暗いテーマ、全面的に等幅 |
| `replicate.md` | Replicate | 白いキャンバス、コードを前面に |
| `runwayml.md` | RunwayML | 映画的な暗い UI、メディア中心のレイアウト |
| `together.ai.md` | Together AI | 技術的で、設計図のようなデザイン |
| `voltagent.md` | VoltAgent | 漆黒のキャンバス、エメラルドの差し色、ターミナルらしさ |
| `x.ai.md` | xAI | 硬質なモノクローム、未来的なミニマリズム、全面的に等幅 |

### 開発ツールとプラットフォーム {#developer-tools-platforms}

| テンプレート | サイト | 作風 |
|---|---|---|
| `cursor.md` | Cursor | 洗練された暗い画面、グラデーションの差し色 |
| `expo.md` | Expo | 暗いテーマ、詰まった字間、コード中心 |
| `linear.app.md` | Linear | 極限までそぎ落とした暗いモード、精密、紫の差し色 |
| `lovable.md` | Lovable | 遊び心のあるグラデーション、親しみやすい開発者向けの雰囲気 |
| `mintlify.md` | Mintlify | すっきり、緑の差し色、読みやすさを最適化 |
| `posthog.md` | PostHog | 遊び心のあるブランド、開発者にやさしい暗い UI |
| `raycast.md` | Raycast | 洗練された暗い質感、鮮やかなグラデーションの差し色 |
| `resend.md` | Resend | そぎ落とした暗いテーマ、等幅の差し色 |
| `sentry.md` | Sentry | 暗いダッシュボード、情報量が多い、ピンク寄りの紫が差し色 |
| `supabase.md` | Supabase | 暗いエメラルドのテーマ、コード優先の開発ツール |
| `superhuman.md` | Superhuman | 高級感のある暗い UI、キーボード優先、紫の光 |
| `vercel.md` | Vercel | 白と黒の精密さ、Geist のフォント体系 |
| `warp.md` | Warp | IDE のような暗い画面、ブロック単位のコマンド UI |
| `zapier.md` | Zapier | あたたかいオレンジ、親しみやすいイラスト中心 |

### インフラとクラウド {#infrastructure-cloud}

| テンプレート | サイト | 作風 |
|---|---|---|
| `clickhouse.md` | ClickHouse | 黄色を差し色にした、技術文書らしい作り |
| `composio.md` | Composio | 現代的な暗さと、色とりどりの連携アイコン |
| `hashicorp.md` | HashiCorp | 企業らしいすっきりさ、白と黒 |
| `mongodb.md` | MongoDB | 緑の葉のブランド、開発者向け文書を中心に |
| `sanity.md` | Sanity | 赤の差し色、内容を第一に置く編集的なレイアウト |
| `stripe.md` | Stripe | 象徴的な紫のグラデーション、細字（weight 300）の上品さ |

### デザインと生産性 {#design-productivity}

| テンプレート | サイト | 作風 |
|---|---|---|
| `airtable.md` | Airtable | 色鮮やかで親しみやすい、構造化されたデータらしさ |
| `cal.md` | Cal.com | 中立的ですっきりした UI、開発者に寄せた簡素さ |
| `clay.md` | Clay | 有機的な形、やわらかいグラデーション、演出されたレイアウト |
| `figma.md` | Figma | 多色で鮮やか、遊び心がありながら本格的 |
| `framer.md` | Framer | 力強い黒と青、動きを第一に、デザイン主導 |
| `intercom.md` | Intercom | 親しみやすい青の配色、会話的な UI の型 |
| `miro.md` | Miro | 明るい黄色の差し色、無限に広がるキャンバスらしさ |
| `notion.md` | Notion | あたたかいミニマリズム、セリフの見出し、やわらかい面 |
| `pinterest.md` | Pinterest | 赤の差し色、石積みのグリッド、画像を第一に |
| `webflow.md` | Webflow | 青を差し色にした、磨き込まれたマーケティングサイトらしさ |

### フィンテックと暗号資産 {#fintech-crypto}

| テンプレート | サイト | 作風 |
|---|---|---|
| `coinbase.md` | Coinbase | すっきりした青の個性、信頼を軸にした、機関投資家らしい印象 |
| `kraken.md` | Kraken | 紫を差し色にした暗い UI、情報量の多いダッシュボード |
| `revolut.md` | Revolut | 洗練された暗い画面、グラデーションのカード、フィンテックの精密さ |
| `wise.md` | Wise | 明るい緑の差し色、親しみやすくわかりやすい |

### 企業向けと消費者向け {#enterprise-consumer}

| テンプレート | サイト | 作風 |
|---|---|---|
| `airbnb.md` | Airbnb | あたたかいコーラルの差し色、写真主導、丸みのある UI |
| `apple.md` | Apple | 贅沢な余白、SF Pro、映画的な画像 |
| `bmw.md` | BMW | 高級感のある暗い面、精密な工学らしさ |
| `ibm.md` | IBM | Carbon デザインシステム、構造化された青の配色 |
| `nvidia.md` | NVIDIA | 緑と黒のエネルギー、技術的な力強さ |
| `spacex.md` | SpaceX | 硬質な白黒、画面いっぱいの画像、未来的 |
| `spotify.md` | Spotify | 暗い地に鮮やかな緑、力強い文字、ジャケット写真が主役 |
| `uber.md` | Uber | 力強い白黒、詰まった文字、都市のエネルギー |

## デザインの選び方 {#choosing-a-design}

内容に合わせてデザインを選びます。

- **開発ツール／ダッシュボード:** Linear、Vercel、Supabase、Raycast、Sentry
- **文書／読み物のサイト:** Mintlify、Notion、Sanity、MongoDB
- **マーケティング／ランディングページ:** Stripe、Framer、Apple、SpaceX
- **暗いモードの UI:** Linear、Cursor、ElevenLabs、Warp、Superhuman
- **明るくすっきりした UI:** Vercel、Stripe、Notion、Cal.com、Replicate
- **遊び心のある／親しみやすい:** PostHog、Figma、Lovable、Zapier、Miro
- **高級感／ラグジュアリー:** Apple、BMW、Stripe、Superhuman、Revolut
- **情報量の多い／ダッシュボード:** Sentry、Kraken、Cohere、ClickHouse
- **等幅／ターミナルらしさ:** Ollama、OpenCode、x.ai、VoltAgent
