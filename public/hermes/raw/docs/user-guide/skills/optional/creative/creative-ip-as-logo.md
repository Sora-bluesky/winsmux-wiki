---
title: "Ip As Logo — 32px でも見分けられる、最小限でかわいい IP マスコットのマークを作る"
description: "32px でも見分けられる、最小限でかわいい IP マスコットのマークを作る"
upstream_path: user-guide/skills/optional/creative/creative-ip-as-logo.md
upstream_blob: 54ec430c54c8dc788dc8dd04dbe13b4d4d51793a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-ip-as-logo
---

# Ip As Logo {#ip-as-logo}

32px でも見分けられる、最小限でかわいい IP マスコットのマークを作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で導入します。`hermes skills install official/creative/ip-as-logo` で入ります |
| パス | `optional-skills/creative/ip-as-logo` |
| バージョン | `1.0.0` |
| 作者 | s1dashu (https://github.com/s1dashu, upstream s1dashu/ip-as-logo-skill)、Hermes Agent が移植 |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `logo`, `mascot`, `branding`, `ip-character`, `image-generation`, `creative` |
| 関連 skill | [`pixel-art`](/hermes/docs/user-guide/skills/optional/creative/creative-pixel-art/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# IP as Logo Skill {#ip-as-logo-skill}

できるかぎりシンプルな、かわいい IP キャラクターを作ります。作るのは細かく描き込んだキャラクターのイラストではなく、`32 × 32` でも見分けがつく、小さくまとまった愛らしいシンボルです。

> **Hermes 向けの補足**（この文書の残りは上流のワークフローをそのまま残したもので、
> [s1dashu/ip-as-logo-skill](https://github.com/s1dashu/ip-as-logo-skill) の
> コミット [`b1bf517c`](https://github.com/s1dashu/ip-as-logo-skill/commit/b1bf517c54a407452cfaca98a54668cd052f8e63)
> 時点、2026年8月20日、MIT のスナップショットです。`LICENSE` を参照）:
>
> - **画像生成の経路**: 組み込みの `image_generate` ツールを
>   `aspect_ratio="square"` で使います。使われるバックエンドはユーザーが設定したもので、
>   モデルを選んだり切り替えたりしないでください。指示に従う最近のバックエンド（GPT Image、
>   Seedream、FLUX、Grok Imagine）は、自然言語の `Constraints:` 行を含むプロンプトの骨組みを
>   そのまま受け取れます。`image_generate` には
>   `negative_prompt` パラメーターがないので、必ず下で説明するメインプロンプトに制約を書く方式を使ってください。
> - **候補の並列生成**: 上流の文章で「サブエージェント」とある箇所では、ユーザーが速さを求めていて
>   枚数が多い場合に限り、候補1つにつき1タスクで `delegate_task` を使います。
>   そうでなければ、1ターンの中で `image_generate` を順に呼ぶほうがシンプルで、結果もすべてこの会話に残ります。
> - **結果の保存**: `image_generate` は URL かファイルパスを返します。
>   すべての候補をラベル付きでユーザーに届けてください（プラットフォームごとのファイル受け渡しの作法に従います）。
>   別の場所にアップロードし直したり、後から加工したりはしません。
> - **品質確認**: 下の受け渡しのルールにあるとおり、候補を自動で調べたり、やり直したり、ふるい落としたりしないでください。
>   結果に `vision_analyze` をかけるのは、ユーザーが要件どおりかの確認をはっきり求めたときだけです。

## こんなときに使います {#when-to-use}

プロダクト、リポジトリ、アプリ、コミュニティのためのマスコット、IP キャラクター、ブランドキャラクター、「かわいいロゴ」をユーザーが求めているときに使います。

## 事前に必要なもの {#prerequisites}

- 組み込みの `image_generate` ツール用に、画像生成のバックエンドが設定されていること。`hermes tools` で確認し、ツールがバックエンドなしと報告する場合はそこで1つ有効にします。
- `vision_analyze` は、要件どおりかの確認をはっきり求められたときだけ使います。`delegate_task` は、ユーザーが速さを求めていて枚数が多いときだけ使います。

## 手順 {#procedure}

1. 依頼を読み、明示された IP の題材と、手に入るプロダクトの文脈を取り出します。ユーザーが自分で決めたいとはっきり言わないかぎり、色の方式を選ぶよう求めないでください。
2. ユーザーが IP の題材を指定しておらず、今の作業場所がプロダクトのリポジトリである場合は、質問する前に関係する文脈を読み取り専用で調べます。README、プロダクトの文書、パッケージやアプリのメタデータ、ランディングページの文面、マニフェスト、デザイントークンを優先します。プロダクトの目的、主な利用者、目指す性格をそれなりの確信を持って推測できれば、文脈は十分だと判断します。
3. プロダクトの文脈が足りない場合は、プロダクトが何をするのか、誰のためのものか、どう感じてほしいのかをまとめて、背景についての質問を1回だけ行います。背景についての2回目の質問はしません。答えを受け取ったら、最も裏付けのある解釈で進めます。
4. 文脈が十分になったら、生成の前に必ず簡潔な方向性を3つ示し、6つの独立した候補を1回でまとめて生成することをはっきり提案します。ユーザーが同意するまでは生成しません。ただし、今の依頼がすでに6枚の出力をはっきり許可している場合や、確認なしで進めるよう求めている場合は別です。
5. 提案する3つの方向性は、意図を持って選びます。
   - ユーザーが IP の題材をはっきり指定している場合は、その題材はそのままにして、シルエットの扱い、2つ目の色の領域、決め手になる特徴、性格のどこを強調するか、をもとに3つの異なるデザインの扱い方を提案します。
   - ユーザーが IP の題材を指定していない場合は、本当に異なる IP の題材や比喩を3つ提案します。それぞれをプロダクトの別々の特性やブランドの約束に結びつけてください。理由のない適当な動物を3つ並べるのはやめてください。
6. ユーザーの返答は、そのとおりに解釈します。
   - ユーザーが3つの方向性と6枚の提案をすべて受け入れた場合は、方向性ごとに独立したバリエーションを2つずつ生成し、`A1`、`A2`、`B1`、`B2`、`C1`、`C2` とラベルを付けます。`A1`、`B1`、`C1` は左下に、`A2`、`B2`、`C2` は右下に割り当て、どの方向性も左右それぞれから1回ずつ試されるようにします。
   - ユーザーが方向性を1つ選び、6枚は受け入れた場合は、その方向性で条件をそろえたバリエーションを6つ生成し、`A1` から `A6` までラベルを付けます。奇数番号のバリエーションは左下に、偶数番号は右下に割り当てます。
   - ユーザーが提案した枚数、方向性、割り当てを断った場合は、既定のやり方を押し通そうとせず、ユーザーが示した代わりの指示に従います。
   - あらかじめ許可された少ない枚数（たとえば「ちょうど2枚生成して」）で、ユーザーが方向性を選んでいない場合は、1つの方向性で N 個のバリエーションを作り `A1..AN` とラベルを付けるのを優先します。方向性とその理由は報告に書きます。依頼がすでに具体的な枚数を許可していて、それ以上の確認を禁じている場合は、3つの方向性を提案する段階を飛ばします。手順 4 の「必ず3つの方向性を示す」というルールは、提案の段階を設けられるときにだけ当てはまります。
   - それ以外の偶数の既定枚数では、候補を左下と右下に同数ずつ分けます。奇数の場合は、余った1つをどちらかに意図して割り当て、その偏りを記録します。ユーザーがはっきり求めないかぎり、下中央は使いません。
7. どの候補も、既定では画像全体でちょうど3つの意味のある色にします。IP の基本色をちょうど2色、背景色をちょうど1色です。顔のパーツには、新しい色を足さずに IP の2色を使い回します。ユーザーが別の色数をはっきり求めた場合はそれに従います。必要なプロダクトの手がかり、見分けるための特徴、複雑さの上限、渡された配色は、比較に役立つ程度にそろえておきます。
8. 出力を約束する前に、使える画像生成の経路を確かめます。Hermes では `image_generate` ツールがそれにあたります。設定済みのバックエンドがないと報告された場合は、結果をでっち上げず、ユーザーに1つ有効にしてもらうよう頼みます（`hermes tools`）。
9. 枚数が多く、ユーザーが速さを求めている場合は、`delegate_task` で候補を並列に作ります（1タスクにつき候補1つ。プロダクトの概要と共通の制約は同じにし、それぞれに方向性かバリエーションを1つ割り当てます）。そうでなければ、`image_generate` を別々に呼んで候補を生成します。
10. ユーザーが背景の配色を渡した場合は、ユーザーが別の指示をはっきりしないかぎり、渡された色はすべて背景用に取っておきます。ユーザーが題材の色も指定していなければ、IP の基本色2色は題材と文脈から独自に選びます。過去の配色や例の配色を、背景に使ってよい色の閉じた一覧として扱わないでください。
11. 下の「複雑さの予算」を使って、それぞれの題材を抽象化します。どの候補も、フル解像度の正方形の画像として1枚ずつ生成してください。画像モデルにコンタクトシートやグリッド、複数画像をまとめたシートを作らせてはいけません。プロンプトだけでの再現性を試すときは、前の候補を参照画像として使わないでください。
12. 1回の生成は、一発勝負の創作のくじ引きとして扱います。求められた候補をそれぞれ1回だけ生成し、返ってきた結果はすべてそのまま残して届けます。出力を調べて受け渡しを止めたり、おすすめかどうかに分類したり、自動でやり直したり、後から加工して直したりしないでください。
13. 生成した結果はすべて残し、ラベルを付けます。ラベル、IP の方向性とその理由、割り当てた角、保存先のパス、プロンプトと色の対応、寸法をすべて報告します（バックエンドが画素数なしで URL だけを返す場合は「backend-native square」と報告します。寸法を測るためだけに画像を調べないでください）。結果はすべてまとめて提示し、手直しや差し替えを生成するのは、ユーザーがもう一度のくじ引きをはっきり求めたときだけにします。

生成の前に方向性を提案するときは、それぞれを簡潔に1行で書きます: `<IP subject> — <product connection> — <defining silhouette>`。最後に、上の割り当てで6枚を生成しましょう、と率直に提案して締めくくります。ユーザーが求めないかぎり、題材を探る段階を長いブランディングのワークショップにしないでください。

## 複雑さの予算 {#complexity-budget}

- おおよそ `4–7` 個の大きな基本図形から、ひとつながりの主となる外側のシルエットを1つ作ります。個性、表情、見分けやすさのどれにも役立たない図形は、統合するか削除します。
- 種を決定づける特徴は1つまでにします。たとえば、大きなのど袋のついたくちばし1つ、巻いた角1対、幅の広いバイザー1つなどです。手足や特徴のない題材（ヘビ、おばけ、ぷにぷにした塊）では、決め手の特徴はシルエットの身ぶりでもかまいません。ふっくらしたとぐろ1つ、波打つすそ1つ、といった具合です。その場合、対になる特徴のルールは2つの目だけに当てはまります。
- 内側の大きな色の領域は、IP の基本色2色に対応する2つまでにします。顔は目を2つにし、表情に必要なときだけ小さな口を1つ加えます。眉、ハイライト、鼻の穴、質感、輪郭線、飾りの模様は、見分けるのに欠かせない場合を除いて省きます。
- 繰り返しの羽根、うろこ、毛の房、よろいの板、ボタン、ねじ、数字、ラベル、そのほかの説明的な描き込みは取り除きます。
- 単純化、かわいさ、赤ちゃんのような愛らしい性格を、決め手となる性質にします。題材に合う場合は、大きな頭、小さくまとまった体の比率、やわらかい頬、離れ気味のシンプルな目、落ち着いた親しみやすい表情を優先します。
- 黒で塗りつぶしたシルエットでも読み取れること、`32 × 32` でも見分けがつくことを必須にします。その大きさで特徴が消えたりノイズになったりするなら、大きくするか、統合するか、取り除きます。

## 形の言葉づかいと構図 {#shape-language-and-composition}

- 太く、丸みがあり、どっしりした輪郭と、大きな色の塊を使います。
- とがった角、とがった耳やくちばし、針のような尻尾、細い触角、細い笑み、狭いすき間、鋭い炎や羽根の先端は禁止です。どうしても必要な先端は、はっきり丸く鈍くした端に置き換えます。
- 耳、角、翼、えら、鈴など、対になって個体を見分ける特徴は、両方とも見せます。
- キャラクターはまっすぐ立たせ、割り当てた左下か右下の角からせり出すように配置し、キャンバスのおおよそ `85–95%` を占めさせて、IP が見た目の主役であり続けるようにします。
- その角からせり出している感じが強まるなら、下辺や割り当てた側の辺で切れていてもかまいません。ただし、辺との正確な接し方や決まった切り取り方を指定しないでください。
- ユーザーがはっきり求めないかぎり、キャラクターを中央や下中央に置かないでください。
- 対になって個体を見分ける特徴は、見えている構図の中に両方とも収めます。
- 絵はまっすぐに保ちます。はっきりした依頼がないかぎり、キャンバスを回転させたり、メインのマークを傾けたりしないでください。

## シンプルさと見た目の扱い {#simplicity-and-visual-treatment}

- 大きく、すっきりした、意味のある形と、できるかぎり強いシンプルなシルエットから始めます。内側の特徴に気づくより前に、キャラクターがすぐにわかるべきです。
- 細かい描き分けを足すより、少なく、大きく、やわらかい形を優先します。体のつくりや素材を説明するためだけに特徴を足さないでください。
- 顔のパーツは小さく、シンプルに、控えめにします。目、口、鼻、そのほかの小さな特徴に、つやのある光の点やくぼみの細かい描写を加えないでください。
- 指定した背景色は、見た目に均一なベタ塗りのままにし、風景、質感、後光、周辺減光、光の加減の変化を入れません。
- ほのかな立体感は、「プロンプトの骨組み」で使っている1文だけで求めます。それを数値の強さや、グラデーション、ハイライト、影についての指示に広げないでください。生成された画像にたまたまグラデーション、陰影、軽い立体感が入っていても問題はなく、それを理由にふるい落としたりやり直したりしてはいけません。
- 求める見た目は、粘土、風船、プラスチック、ぬいぐるみ、おもちゃ風、写実的な描写を求めるのではなく、グラフィック的でシンプルな方向に保ちます。

## 色とキャンバス {#color-and-canvas}

- 既定では、画像全体でちょうど3つの意味のある色にします。IP の基本色をちょうど2色、背景色をちょうど1色です。
- IP の2色は、プロダクトの文脈、題材の個性、目指す性格、ユーザーの依頼から選びます。どちらの色も目的のある大きな塊にまとめます。1色は顔のパーツに使い回し、もう1色は飾りの断片として散らさず、ひとつながりの決め手となる領域にまとめます。
- 題材の2色は、背景とは切り離して選びます。題材に合うなら、はっきりした生き生きとした色を優先しますが、IP に対して全体の彩度、OKLCH、色相のずらし、彩度の帯といった枠をはめないでください。
- 背景は、文脈に合わせて自由に選ぶか、ユーザーが渡した配色から選びます。ユーザーが鮮やかな色を求めないかぎり、背景は彩度を少し下げて、ほんのり落ち着かせます。ただし、鮮やかすぎず、グレーや濁った色でもない、はっきり色味があって意図の感じられる色に保ちます。過去の配色や例は提案にすぎず、許可された色の一覧でも、必ず使う既定の配色でもありません。
- 主役の IP のシルエット、その顔のパーツ、背景のあいだは、見た目にはっきり区別がつくようにします。ユーザーが渡した背景のせいで区別が弱くなる場合は、求められた背景を差し替えるのではなく、まず題材の色を調整します。
- 1回の生成の中では、同じ無彩色寄りの組み合わせを繰り返さず、IP の2色の組み立て方を意図して変えます。
- キャラクターの2色は、意味のある色の系統として扱います。どちらかの系統の中でたまたま濃淡が揺れていても、その出力が無効になるわけではありません。
- 意図するベタ塗りの背景色は、名前で直接指定します。割り当てた「せり出す角」はキャラクターが占め、それ以外の開いた部分と、キャラクターがいない角はすべてその色で埋めるよう求めます。生成プロンプトでは、`opaque`、`alpha`、`transparency` のような画像モードの用語を使わないでください。
- 外側の角が直角の、`1:1` の正方形をそのまま生成します（`image_generate` では `aspect_ratio="square"`）。バックエンド本来の正方形の解像度をそのまま受け入れ、特定の画素数にするためだけにリサンプリングしないでください。

## プロンプトの骨組み {#prompt-skeleton}

求める絵は、画像としてだけ説明します。画像生成器に対して、その画像が `logo`、`brand mark`、`app icon`、`icon asset` であるとか、そうした用途を意図しているとか、決して伝えないでください。そうした用途がわかってしまうような、使い道や素材の種類についての前置きも付けません。このルールが当てはまるのは生成プロンプトだけです。周りのユーザーとの会話や skill の名前では、プロジェクト全体のことを説明してかまいません。

`image_generate` はプロンプトの文字列を1つだけ受け取るので、自然言語の `Constraints:` 行は必ずメインのプロンプトの中に入れておきます（ネガティブプロンプト用の別の経路はありません）。候補ごとに使ったプロンプトと色の対応は、生成の報告に記録します。

```text
Create one complete full-bleed 1:1 square image.
Background: fill the entire square with solid <background>. Keep <background> visible in every open area and in the corners not occupied by the character; the assigned emergence corner must be occupied by the character.
Subject: place one extremely simplified, cute, endearing <subject> IP character on the background, reduced to one soft rounded continuous silhouette and one defining feature.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple eyes and add one tiny mouth only when it helps the expression. Remove every nonessential line, outline, anatomical detail, texture, and decoration. Keep the character readable at 32 × 32.
Color behavior: use exactly three semantic colors in the complete image: exactly two IP base colors plus the background color. Choose the two IP colors from the subject and context, organize both into broad purposeful masses, and reuse them for facial marks. Choose the background independently or follow the user's supplied background. Unless the user asks for vivid color, lower the background saturation slightly so it feels gently muted and restrained while remaining clearly chromatic, clean, and intentional rather than gray or muddy. Keep the IP, facial marks, and background clearly separated. Treat any example palette as optional inspiration, never as an allowlist.
Composition: keep the character upright and emerging from the assigned <lower-left or lower-right>, filling about 85–95% of the square so it remains visually dominant. Cropping at the bottom or assigned side is welcome when it strengthens the corner emergence. Preserve both paired identifying features. Never center or bottom-center the character.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Prefer one clear shape over several explanatory details. Add an extremely, extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the character on the full-canvas background, with clean surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or presentation masks. Include one character only, with no extra subjects or scenery. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, or decorative marks. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background solid and uniform, with no texture, vignette, or lighting variation.
```

## 受け渡しのしかた {#delivery-behavior}

- 生成は、要件への適合テストではなく、確率的なくじ引きとして扱います。
- 求められた数の独立した候補を1回だけ生成し、返ってきた画像はすべて届けます。
- 既定では、アルファ、透過、背景のモードを調べたり報告したりしません。
- 背景、色、描き込み、構図、グラデーション、陰影、立体感を理由に、受け渡しを止めたり、候補を要件どおりかどうかで順位付けしたり、おすすめかどうかの印を付けたり、自動でやり直したりしないでください。
- 要件どおりに見せるために、結果を後から加工しないでください。ユーザーがあとで別の方向性や差し替えを求めた場合は、そのはっきりした依頼に応えて、新しい独立した候補を生成します。

## つまずきやすいところ {#pitfalls}

- 最も大きな失敗の形は、描き込みがじわじわ増えることです。モデルは輪郭線、質感、余計な色、風景を足してきます。プロンプトの骨組みにある `Constraints:` 行は要の部分なので、決して削らないでください。
- 生成プロンプトの中で画像を「ロゴ」や「アイコン」と呼ぶと、見せ方の枠（バッジ、カード、モックアップ）が付いてしまいます。プロンプトは純粋に絵の説明だけにしてください。
- 1回の呼び出しでバリエーションのグリッドやコンタクトシートを求めると、小さくてばらばらなキャラクターになります。1回の呼び出しで候補は1つ、を必ず守ってください。
- 1回の生成の中で2つの候補がほぼ同じになって返ってきても、それは確率的な挙動としてふつうのことです。両方とも届け、黙って作り直さないでください。

## 確認 {#verification}

- 届けたどの候補にも、最終報告の中でラベル、方向性の理由、割り当てた角、プロンプトと色の対応、ファイルパスか URL が付いている。
- 生成した枚数がユーザーの承認した数と一致していて、出さずにおいた候補、やり直した候補、後から加工した候補が1つもない。
