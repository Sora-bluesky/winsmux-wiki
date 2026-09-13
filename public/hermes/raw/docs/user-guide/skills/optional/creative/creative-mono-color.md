---
title: "Mono Color — 1色または2色刷りの、編集デザイン調の印刷ポスター画像を作る"
description: "1色または2色刷りの、編集デザイン調の印刷ポスター画像を作る"
upstream_path: user-guide/skills/optional/creative/creative-mono-color.md
upstream_blob: 9c7f0c782c720657d456dca017ea7b69c928f9ff
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-mono-color
---

# Mono Color {#mono-color}

1色または2色刷りの、編集デザイン調の印刷ポスター画像を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/mono-color` で入れます |
| パス | `optional-skills/creative/mono-color` |
| バージョン | `1.0.0` |
| 作者 | Yan Liu（Nous Research が改変） |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `design`, `poster`, `print`, `duotone`, `risograph`, `editorial`, `image-generation` |
| 関連 skill | [`baoyu-infographic`](/hermes/docs/user-guide/skills/bundled/creative/creative-baoyu-infographic/), [`meme-generation`](/hermes/docs/user-guide/skills/optional/creative/creative-meme-generation/), [`pixel-art`](/hermes/docs/user-guide/skills/optional/creative/creative-pixel-art/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Mono-Color 編集デザイン印刷 skill {#mono-color-editorial-print-skill}

ユーザーのテーマ、一文、参考写真のどれからでも、一貫した視覚言語を持つオリジナルの印刷物風の編集デザインを作ります。視覚言語の中身は、状況に合わせたニュートラルな用紙 + 1色か2色のインク + 機械的に複製した画像 + 文字組みの緊張感 + 簡潔で人間味のある言葉、です。

この skill は画像を設計して生成します。特定の参考作品をまねたり、元の構図、文言、ロゴ、作品を写したりはしません。印刷インクを2色より多く使うこともありません。

## こんなときに使います {#when-to-use}

ユーザーが、モノクロの編集デザインのポスター、2色刷り（duotone）、リソグラフやジン風のポスター、網点処理した写真、1色刷りや2色刷りの表紙を求めたとき、または mono-color スタイルを名指ししたときに使います。中国語での呼び出し語には 单色海报、双色印刷、单色调视觉、蓝色/绿色孔版印刷、网点照片、复古或当代编辑排版 があります。依頼に色の名前が出てきただけでは呼び出しません。

## 事前に必要なもの {#prerequisites}

- Hermes の `image_generate` ツール（読み込まれていなければ、遅延ツールのカタログで検索して説明を取得します）。画像生成が使えない場合は、プロンプトだけを渡し、その旨を伝えます。
- この skill に同梱の `design-system/` カタログ（早見表を参照）。

## 早見表 {#quick-reference}

印刷モード:

| モード | 使う場面 |
|---|---|
| 純粋な1色刷り | ユーザーが1色刷り、モノクロ、または2色目なしで特定のインク1色を明示したとき |
| 有彩色インク + 黒 | 静かで観察的な題材、自然、建築、長文の題材。有彩色の版が画像を担い、カーボン／チャコールの版が文字を担う |
| 補色の2色刷り | 一般的な既定。主となる版が 70〜85%、アクセントが 15〜30% で役割をはっきり持たせる。代わりの組み合わせは Cobalt + Terracotta `#2148B8` + `#C65F38` |
| 重ね刷りの2色刷り | 2つの版をわざと重ねる。重なって暗くなった部分は3色目のインクではない |

カタログ（正本です。**正確な値が文章と食い違う場合は、どの文章よりもカタログが優先されます**。いま決めることに関係するカタログだけを読みます）:

| ファイル | 内容 |
|---|---|
| `design-system/colors.json` | 用紙の ID と正確な hex 値、1色刷りのパレット、承認済みの2色の組み合わせ |
| `design-system/compositions.json` | レイアウトの系統の ID と配置 |
| `design-system/typography.json` | 文字の階層の役割 ID |
| `design-system/rhythm.json` | 視覚的な緊張感のプロファイル、焦点となる出来事、閉じない端 |
| `design-system/imperfections.json` | 制御された印刷の不完全さを出す効果の ID と範囲 |
| `design-system/carriers.json` | 媒体の手がかり（ポスター、雑誌のページ、表紙など） |

参考資料:

- `references/visual-language.md` — 色、余白、画像処理、文字組み、トーンの規則の全体
- `references/composition.md` — レイアウトの決め方、レイアウトの系統、構図の文法、リズム
- `references/quality-gate.md` — 独自性の防火壁、絶対に避けること、点検のチェックリスト

## 手順 {#procedure}

1. **入力を読みます。** 次の5つを取り出します。
   - **題材:** 見てすぐ分かる状態で残すべき、1人の人物、1つの物、1つの場面、1つの考え。
   - **意図:** 詩的な観察、告知、フィールドノート、個人的な表明、文化イベントのポスター、標本ページのいずれか。
   - **言葉:** 渡された文章は、元の言語のまま一字一句そのまま使います。翻訳や書き換えはしません。文章がなければ、2〜8語の英語の見出しを1つ考え、やり直しても同じものを使います。文字を入れないのは、明示的に頼まれたときだけです。
   - **画像の役割:** 主役の写真、切り抜いた標本、切り取った断片、質感の素材、または画像なし。
   - **表現:** 忠実な複製（既定）、または抽象的な記号の抽出（ユーザーが抽象的、芸術的、ラフ、実験的、写実を抑えた、写真らしさを抑えた処理を求めたとき）。

   複雑なテーマなら、具体的な視覚的メタファーを1つ選びます。すべての論点を絵にしようとしません。ユーザーが画像を渡した場合は、その同一性と事実としての内容を守ります。切り抜く、切り出す、網点にするのはかまいませんが、題材を差し替えたり、ブランドにまつわる細部を作り足したりはしません。

2. **レシピのマニフェストを確定します。** すべての項目を埋めます。飛ばしてはいけません。ユーザーが工程の詳細を求めない限り、マニフェストは見せません。ID と正確な値は `design-system/` で調べます。

   ````yaml
   subject: <one recognizable subject>
   intent: <one intent from Input Reading>
   exact_text: <user text, generated 2-8 word phrase, or none>
   text_language: <language of supplied text, otherwise English>
   representation: <faithful reproduction or abstract symbol extraction>
   ratio: <explicit ratio or 3:4>
   carrier: <one carrier ID from design-system/carriers.json or none>
   substrate: <one substrate ID and exact hex from design-system/colors.json>
   mode: <pure one-ink, chromatic + black, complementary duotone, or overprint duotone>
   palette: <one palette ID from design-system/colors.json>
   inks: <the palette's named ink or approved pair with exact hex values>
   plate_roles: <one explicit role per ink plate>
   layout: <one composition ID from design-system/compositions.json>
   empty_paper: <explicit percentage>
   visual_tension: <relaxed, balanced, or assertive from design-system/rhythm.json>
   focal_event: <one strong visual event from design-system/rhythm.json>
   release_zone: <one deliberately quiet region that gives the focal event room>
   unresolved_edge: <one optional edge behavior from design-system/rhythm.json or none>
   image_treatment: <one mechanical reproduction process>
   type_hierarchy: <one role ID from design-system/typography.json>
   disruption: <one deliberate disruption>
   imperfection_seed: <stable hash derived from the resolved recipe>
   imperfections: <0-2 restrained effect IDs for contemporary work, or 2-3 for tactile/vintage work>
   ````

   ユーザーが選んでいない項目の既定値は次のとおりです。比率は `3:4`。用紙は Neutral White `#FAFAF7`（建築、テクノロジー、抑えたトーンなら Cool Gray `#E9E9E5`。Pale Beige `#F5F1E8` は手触り、アーカイブ、郷愁を感じさせる題材のときだけで、網点やリソグラフの表現を使うからといってベージュを前提にしてはいけません）。モードは Cobalt + Terracotta の補色の2色刷り。余白の紙は `35%`。緊張感は、内省的な題材、余暇の題材、特に指定のない文化的な題材なら `relaxed`、編集的な情報なら `balanced`、強い宣言のときだけ `assertive`。崩しは、画像の中心を外した切り取りを1つ、画像がない場合は特大の単語を1つ。ユーザーが明示した選択は、2色の上限や独自性の防火壁に反しない限り既定値より優先します。同じ入力からは必ず同じマニフェストを導きます。目新しさのためにパレット、レイアウト、割合、工程を変えてはいけません。

   一般的な色の言葉は、いつも同じように読み替えます。blue→Cobalt、green→Botanical Green、orange→Terracotta Orange、red→Signal Red、purple→Aubergine、black→Charcoal。green+black→Mint Green + Charcoal、blue+orange→Cobalt + Terracotta。インクの正確な名前が指定されていれば、常にそちらを優先します。

3. **レイアウトを選びます。** `references/composition.md` の決め方を上から順にたどり、最初に当てはまったものを採ります（イベント→罫線入りの情報ポスター、植物→アーカイブの図版、繰り返す物→物の並ぶ面、交差する層→重ね刷りのコラージュ、渡された写真→画像を敷く面か編集デザインの表紙、単独の物→標本の注釈、言葉そのものが題材→文字主体の宣言、エッセイ風→編集デザインの誌面、それ以外→編集デザインの表紙）。

4. **プロンプトを組み立てます。** 簡潔な5つの段落で、この順に書きます。
   1. **画面とインク:** 比率、用紙の正確な hex 値とその理由、1色または2色のパレットの正確な hex 値、印刷モード、版の役割、正面から見た平らなページ（モックアップ、額、机、影はなし）。
   2. **オリジナルの構図:** レイアウトの系統、緊張感のプロファイル、焦点となる出来事1つ、抜けの領域1つ、余白（5〜9%）、余白の紙の割合（25〜55%）、グリッド、主となる物の大きさ（ページの 45〜80%）と端での切り取り、任意の閉じない端、手作業の身ぶり1つ。
   3. **題材:** 何が写るか。忠実な複製なら、保存、切り取り、網点、紙の見せ方。抽象的な抽出なら、同一性の手がかり2〜4つ、主となる塊、構造の輪郭、繰り返すリズム、紙の地がどこを切り裂くか。
   4. **文字と言葉:** 階層、書体の声、短い見出しの正確な文言、そして見出しと主となる物のあいだの重なり、交差、分割、ぴったりした揃えを明示すること。
   5. **質感と避けること:** 網点、繊維、にじみ、版ずれ、そして `references/quality-gate.md` にある絶対に守る禁止事項。

   目に見える結果だけを書きます。参考にした作家、スタジオ、見本のポスターの名前や、「in the style of」は決して書きません。

5. **生成して点検します。** 組み立てたプロンプトで `image_generate` を呼びます。原寸とサムネイルの大きさで、`references/quality-gate.md` のチェックリストに照らして点検します。不合格なら1回だけ作り直します（余分なインク、版の役割がない、余白の紙が 25〜55% の範囲外、題材が分からない、文字の大きさに5倍以上の差がない、文字が崩れている、構図が参考作品を写している、焦点となる出来事が見当たらない）。1回やり直しても正確な文字がまだ正しく出ない場合は、文字を控えた下地の画像を作り、文字組みはレイアウトツールで重ねるべきだと伝えます。崩れた文字を正しいかのように扱ってはいけません。

6. **納品します。** 出力はユーザーの作業ディレクトリの `./mono-color-output/` に保存します（なければ作ります）。ユーザーが別の場所を指定した場合はそこに保存します。次のものを提示します。
   1. 生成した画像（パスまたは表示）
   2. 最終的なプロンプトを `text` のコードブロックで
   3. 短いレシピのメモ: モード、インク（正確な hex 値）、レイアウト、文字（編集用の声と実用の声）、工程、そして渡された参考作品から構造的にどう離れたかを述べる独自性の一文

   プロンプトだけで止めるのは、ユーザーが明示的に求めたとき、または画像生成が使えないときだけです。

## つまずきやすいところ {#pitfalls}

- **印刷インクは決して2色を超えません。** 用紙はインクではありません。重ね刷りの混色や濃度の変化も、インクが増えたことにはなりません。グラデーション、虹色のアクセント、フルカラーの写真はいつでも使えません。
- **文章よりカタログが優先です。** `design-system/` にある hex 値、ID、範囲、配置が文章の説明と食い違う場合は、カタログの値を使います。
- **渡された文章は一字一句そのまま使います** — 元の言語で、正確な文言で、頼まれない限り翻訳しません。細かい注記や事実を述べる文字を、不完全さの効果で崩してはいけません。
- **元の構図、文言、ロゴ、作品を決して写しません。** 渡された参考作品からは、構造上の特徴を少なくとも4つ変えます（独自性の防火壁を参照）。偽の署名、誌名ロゴ、スポンサー、URL、作り上げたブランドは入れません。
- **既定は現代的な仕上がりです。** 網点や限られたインクを使うからといって、黄ばんだ紙、セピア、傷んだ縁、レトロな小道具を足しません。足すのは、ユーザーがビンテージやアーカイブの雰囲気を求めたときだけです。
- **焦点となる出来事は1つ、抜けの領域も1つです。** すべてを中央に置かない、要素をテンプレートのように均等に配らない、静かな領域を飾りで埋めない。

## 確認 {#verification}

- マニフェストがすべて確定し、どの ID も `design-system/` のカタログに存在する。
- 結果が、意図して選んだ白、グレー、淡いベージュの用紙を1つ使い、版の役割がはっきりした2色以下のインクで刷られている。
- 目で見て分かる余白の紙が 25〜55%。主となる物が1つで 45〜80%。見出しがはっきりそれと交差するか、ぴたりと揃っている。
- 文字の階層に 5〜12 倍の大きさの差があり、書体の声は3つ以下。
- 渡された題材と文章がそのまま守られ、渡されたどの参考作品とも構造上の特徴が4つ以上違う。
- 画像が生成され（プロンプトだけを求められた場合を除く）、出力ディレクトリに保存され、レシピのメモが渡されている。

## お知らせ {#notice}

上流の作例画像は含まれていません。元のリポジトリの `examples/` は著作権がすべて留保されているためです（上流の ASSET-LICENSE.md を参照）。ここに取り込んでいるのは、MIT ライセンスの文章と design-system のカタログだけです。コードと文章は MIT です（`LICENSE.txt` を参照）。
