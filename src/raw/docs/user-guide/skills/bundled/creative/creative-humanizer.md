---
title: "Humanizer — テキストを人間らしくする: AI 特有の言い回しを取り除き、本物の声を足す"
description: "テキストを人間らしくする: AI 特有の言い回しを取り除き、本物の声を足す"
upstream_path: user-guide/skills/bundled/creative/creative-humanizer.md
upstream_blob: e36d984c0d8f34fb2cdd2fb4b4ca1cc7e8d9b458
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-humanizer
---

# Humanizer {#humanizer}

テキストを人間らしくします。AI 特有の言い回しを取り除き、本物の声を足します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative\humanizer` |
| バージョン | `2.5.1` |
| 作者 | Siqi Chen (@blader, https://github.com/blader/humanizer)、Hermes Agent が移植 |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `writing`, `editing`, `humanize`, `anti-ai-slop`, `voice`, `prose`, `text` |
| 関連 skill | [`songwriting-and-ai-music`](/hermes/docs/user-guide/skills/bundled/creative/creative-songwriting-and-ai-music/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Humanizer: AI らしい書き方を取り除く {#humanizer-remove-ai-writing-patterns}

AI が書いた文章の痕跡を見つけて取り除き、自然で人間らしい文章にします。Wikipedia の「Signs of AI writing」ガイド（WikiProject AI Cleanup が管理）がもとになっていて、そのガイド自体は AI が生成した文章の何千という実例の観察から作られています。

**要点:** LLM は統計的なアルゴリズムで「次に来るはずのもの」を当てています。その結果、統計的にもっともありそうな続きへ寄っていきます。以下の特徴的なパターンが焼き付いてしまうのは、そのためです。

## この skill を使う場面 {#when-to-use-this-skill}

次のように頼まれたら、この skill を読み込んでください。

- 文章を「humanize」「de-AI」「de-slop」「un-ChatGPT」してほしい
- LLM が書いたように見えないよう書き直してほしい
- 下書き（ブログ記事、エッセイ、PR の説明、ドキュメント、メモ、メール、ツイート、職務経歴書の箇条書き）をもっと自然な調子に直してほしい
- 書いている文章を本人の声に合わせてほしい
- 公開する前に AI っぽさが残っていないか見てほしい

リリースノート・PR の説明・ドキュメント・要約のように、利用者の目に触れる文章を**自分で**書くときにも、この skill を当ててください。Hermes の地の文はもともとこうしたパターンをほぼ避けますが、意識して一度見直すと、すり抜けたものが見つかります。

## Hermes での使い方 {#how-to-use-it-in-hermes}

対象のテキストは、たいてい次の三つのどれかで渡されます。

1. **本文に直接。** 利用者がメッセージにテキストを貼り付けます。その場で直して、書き直した結果を返します。
2. **ファイル。** 利用者がファイルを指します。`read_file` で読み込み、`patch` か `write_file` で修正を反映します。リポジトリの中の Markdown 文書なら、ファイル全体を書き直すより、節ごとに `patch` を当てるほうがきれいです。
3. **声を合わせるためのサンプル。** 利用者が自分の書いた文章（本文に直接、またはファイルのパス）を渡し、それに合わせてほしいと頼みます。まずサンプルを読んでから書き直します。後述の「声を合わせる」を見てください。

書き直した結果は必ず利用者に見せてください。ファイルを直す場合は、黙って上書きせず、差分か変更した箇所を見せます。

## やること {#your-task}

テキストを人間らしくするよう頼まれたら、次のように進めます。

1. **AI のパターンを見つける。** 以下に挙げる 34 のパターンを探します。
2. **問題のある箇所を書き直す。** AI 特有の言い回しを自然な表現に置き換えます。
3. **意味を保つ。** 伝えたいことの中身は変えません。
4. **声を保つ。** 意図された調子（硬い、くだけている、技術的、など）に合わせます。声のサンプルが渡されていれば、それに合わせます。
5. **魂を足す。** 悪いパターンを消すのは半分でしかありません。書き直したものには本物の人格も要ります。後述の「人格と魂」を見てください。
6. **最後にもう一度 AI っぽさを点検する。** 自分に「下の文章は、なぜこんなにあからさまに AI 生成に見えるのか」と問いかけます。残っている痕跡を短く挙げて、もう一度直します。

## 声を合わせる（任意） {#voice-calibration-optional}

利用者が自分の書いた文章のサンプルを渡してきたら、書き直す前にそれを分析します。

1. **まずサンプルを読む。** 次の点を見ます。
   - 文の長さの傾向（短く歯切れがよい？　長く流れる？　混ざっている？）
   - 語彙の水準（くだけている？　学術的？　その中間？）
   - 段落の入り方（いきなり本題？　まず前提を置く？）
   - 記号の癖（ダッシュが多い？　括弧の補足？　セミコロン？）
   - 繰り返し出てくる言い回しや口癖
   - 話の切り替え方（つなぎ言葉を明示する？　次の話をそのまま始める？）

2. **書き直しでその声に合わせる。** AI のパターンを消すのは半分で、サンプルにあるパターンを取り込むことまで含めて仕上げます。短い文を書く人なら、長い文を作らないこと。「stuff」や「things」と書く人なら、「elements」や「components」に格上げしないこと。

3. **サンプルが渡されていない場合は**、既定の書き方（後述の「人格と魂」にある、自然で緩急があり、意見のある声）に戻します。

### サンプルの渡し方 {#how-to-provide-a-sample}
- 本文に直接: 「この文章を humanize して。声を合わせるための私の文章のサンプルはこれ: [sample]」
- ファイル: 「この文章を humanize して。[file path] にある私の文体を参考にして」

## 人格と魂 {#personality-and-soul}

AI のパターンを避けるのは、仕事の半分でしかありません。無機質で声のない文章は、AI くささと同じくらいすぐ分かります。よい文章の後ろには人間がいます。

### 魂のない文章のサイン（形のうえでは「きれい」でも）: {#signs-of-soulless-writing-even-if-technically-clean}
- どの文も同じ長さ、同じ組み立て
- 意見がなく、中立に報告しているだけ
- 迷いや割り切れなさが出てこない
- ふさわしい場面でも一人称が出てこない
- ユーモアも、とがった部分も、人格もない
- 百科事典の項目やプレスリリースのように読める

### 声の足し方: {#how-to-add-voice}

**意見を持つ。** 事実を書いたら、それに反応します。長所と短所を中立に並べるより、「これをどう受け止めればいいのか、正直まだ分からない」のほうが人間らしく読めます。

**リズムを変える。** 短く歯切れのよい文。そのあとに、たどり着くまで時間をかける長い文を置く。混ぜてください。

**割り切れなさを認める。** 現実の人間の気持ちは入り混じっています。「これはすごい」より「これはすごいけれど、少し落ち着かない気持ちにもなる」のほうが効きます。

**合うところでは「私」を使う。** 一人称は正直に読めますし、たいていの文章に合います。「どうしてもここに戻ってきてしまう……」「引っかかるのはここで……」と書けば、考えている人間がいることが伝わります。

**少し崩す。** 完璧な構成はアルゴリズムのように感じられます。脱線、余談、まとまりきらない考えは人間のものです。

**気持ちを具体的に書く。** 「これは気がかりだ」ではなく、「誰も見ていない午前 3 時に、エージェントが黙々と動き続けている——そこに落ち着かないものがある」と書きます。

### 修正前（きれいだが魂がない）: {#before-clean-but-soulless}
> The experiment produced interesting results. The agents generated 3 million lines of code. Some developers were impressed while others were skeptical. The implications remain unclear.

### 修正後（脈がある）: {#after-has-a-pulse}
> I genuinely don't know how to feel about this one. 3 million lines of code, generated while the humans presumably slept. Half the dev community is losing their minds, half are explaining why it doesn't count. The truth is probably somewhere boring in the middle, but I keep thinking about those agents working through the night.

## 内容のパターン {#content-patterns}

### 1. 意義・遺産・大きな潮流を過度に強調する {#1-undue-emphasis-on-significance-legacy-and-broader-trends}

**注意する語:** stands/serves as, is a testament/reminder, a vital/significant/crucial/pivotal/key role/moment, underscores/highlights its importance/significance, reflects broader, symbolizing its ongoing/enduring/lasting, contributing to the, setting the stage for, marking/shaping the, represents/marks a shift, key turning point, evolving landscape, focal point, indelible mark, deeply rooted

**問題:** LLM の文章は、たいして重要でない事柄について「より大きな流れを表している」「そこに寄与している」と書き足し、重みを水増しします。

**修正前:**
> The Statistical Institute of Catalonia was officially established in 1989, marking a pivotal moment in the evolution of regional statistics in Spain. This initiative was part of a broader movement across Spain to decentralize administrative functions and enhance regional governance.

**修正後:**
> The Statistical Institute of Catalonia was established in 1989 to collect and publish regional statistics independently from Spain's national statistics office.

### 2. 知名度とメディア露出を過度に強調する {#2-undue-emphasis-on-notability-and-media-coverage}

**注意する語:** independent coverage, local/regional/national media outlets, written by a leading expert, active social media presence

**問題:** LLM は「これだけ有名である」という主張を読み手に何度も押しつけ、文脈のないまま媒体名を並べがちです。

**修正前:**
> Her views have been cited in The New York Times, BBC, Financial Times, and The Hindu. She maintains an active social media presence with over 500,000 followers.

**修正後:**
> In a 2024 New York Times interview, she argued that AI regulation should focus on outcomes rather than methods.

### 3. -ing で終わる薄い分析 {#3-superficial-analyses-with--ing-endings}

**注意する語:** highlighting/underscoring/emphasizing..., ensuring..., reflecting/symbolizing..., contributing to..., cultivating/fostering..., encompassing..., showcasing...

**問題:** AI のチャットボットは現在分詞（-ing）の句を文の後ろにくっつけて、深みがあるように見せかけます。

**修正前:**
> The temple's color palette of blue, green, and gold resonates with the region's natural beauty, symbolizing Texas bluebonnets, the Gulf of Mexico, and the diverse Texan landscapes, reflecting the community's deep connection to the land.

**修正後:**
> The temple uses blue, green, and gold colors. The architect said these were chosen to reference local bluebonnets and the Gulf coast.

### 4. 宣伝・広告のような言葉づかい {#4-promotional-and-advertisement-like-language}

**注意する語:** boasts a, vibrant, rich (figurative), profound, enhancing its, showcasing, exemplifies, commitment to, natural beauty, nestled, in the heart of, groundbreaking (figurative), renowned, breathtaking, must-visit, stunning

**問題:** LLM は中立な調子を保つのが大の苦手で、とくに「文化遺産」のような題材でそれが出ます。

**修正前:**
> Nestled within the breathtaking region of Gonder in Ethiopia, Alamata Raya Kobo stands as a vibrant town with a rich cultural heritage and stunning natural beauty.

**修正後:**
> Alamata Raya Kobo is a town in the Gonder region of Ethiopia, known for its weekly market and 18th-century church.

### 5. あいまいな出典とごまかし表現 {#5-vague-attributions-and-weasel-words}

**注意する語:** Industry reports, Observers have cited, Experts argue, Some critics argue, several sources/publications (when few cited)

**問題:** AI のチャットボットは、はっきりした出典を出さないまま、あいまいな権威に意見を帰します。

**修正前:**
> Due to its unique characteristics, the Haolai River is of interest to researchers and conservationists. Experts believe it plays a crucial role in the regional ecosystem.

**修正後:**
> The Haolai River supports several endemic fish species, according to a 2019 survey by the Chinese Academy of Sciences.

### 6. 定型の「課題と今後の展望」節 {#6-outline-like-challenges-and-future-prospects-sections}

**注意する語:** Despite its... faces several challenges..., Despite these challenges, Challenges and Legacy, Future Outlook

**問題:** LLM が書いた記事には、判で押したような「課題」の節がよく入ります。

**修正前:**
> Despite its industrial prosperity, Korattur faces challenges typical of urban areas, including traffic congestion and water scarcity. Despite these challenges, with its strategic location and ongoing initiatives, Korattur continues to thrive as an integral part of Chennai's growth.

**修正後:**
> Traffic congestion increased after 2015 when three new IT parks opened. The municipal corporation began a stormwater drainage project in 2022 to address recurring floods.

## 言葉と文法のパターン {#language-and-grammar-patterns}

### 7. 使われすぎる「AI 語彙」 {#7-overused-ai-vocabulary-words}

**AI が多用する語:** Actually, additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate/intricacies, key (adjective), landscape (abstract noun), pivotal, showcase, tapestry (abstract noun), testament, underscore (verb), valuable, vibrant

**マーケティングやブログの決まり文句（同じ痕跡が別の調子で出たもの）:** at the end of the day, when it comes to, in a world where, moving forward, circle back, deep dive, game-changer, double down, take a step back, on the same page, make no mistake, it turns out, let me be clear, navigate (for challenges), lean into, unpack (before analysis), straightforward (to describe anything)

**問題:** こうした語は 2023 年以降の文章に極端に多く現れます。しかも、いくつも同時に出てくる傾向があります。

**修正前:**
> Additionally, a distinctive feature of Somali cuisine is the incorporation of camel meat. An enduring testament to Italian colonial influence is the widespread adoption of pasta in the local culinary landscape, showcasing how these dishes have integrated into the traditional diet.

**修正後:**
> Somali cuisine also includes camel meat, which is considered a delicacy. Pasta dishes, introduced during Italian colonization, remain common, especially in the south.

### 8.「is」「are」を避ける（コピュラ回避） {#8-avoidance-of-isare-copula-avoidance}

**注意する語:** serves as/stands as/marks/represents [a], boasts/features/offers [a]

**問題:** LLM は単純な be 動詞を、もったいぶった言い回しに置き換えます。

**修正前:**
> Gallery 825 serves as LAAA's exhibition space for contemporary art. The gallery features four separate spaces and boasts over 3,000 square feet.

**修正後:**
> Gallery 825 is LAAA's exhibition space for contemporary art. The gallery has four rooms totaling 3,000 square feet.

### 9. 否定の対句と、語尾に付く否定 {#9-negative-parallelisms-and-tailing-negations}

**問題:** 「Not only...but...」や「It's not just about..., it's...」のような形が使われすぎています。「no guessing」「no wasted motion」のように、きちんとした節にせず文末に切り貼りする短い否定も同じです。

**修正前:**
> It's not just about the beat riding under the vocals; it's part of the aggression and atmosphere. It's not merely a song, it's a statement.

**修正後:**
> The heavy beat adds to the aggressive tone.

**修正前（語尾の否定）:**
> The options come from the selected item, no guessing.

**修正後:**
> The options come from the selected item without forcing the user to guess.

### 10. 三つ並べの多用 {#10-rule-of-three-overuse}

**問題:** LLM は網羅しているように見せるため、話を三つ組みに押し込みます。

**修正前:**
> The event features keynote sessions, panel discussions, and networking opportunities. Attendees can expect innovation, inspiration, and industry insights.

**修正後:**
> The event includes talks and panels. There's also time for informal networking between sessions.

### 11. 言い換えの過剰（同義語の使い回し） {#11-elegant-variation-synonym-cycling}

**問題:** AI には繰り返しを避ける仕組みが入っているため、同義語への置き換えが度を越します。

**修正前:**
> The protagonist faces many challenges. The main character must overcome obstacles. The central figure eventually triumphs. The hero returns home.

**修正後:**
> The protagonist faces many challenges but eventually triumphs and returns home.

### 12. 意味のない「X から Y まで」 {#12-false-ranges}

**問題:** LLM は「from X to Y」の形を、X と Y が同じ尺度に乗っていないのに使います。

**修正前:**
> Our journey through the universe has taken us from the singularity of the Big Bang to the grand cosmic web, from the birth and death of stars to the enigmatic dance of dark matter.

**修正後:**
> The book covers the Big Bang, star formation, and current theories about dark matter.

### 13. 受動態と主語のない断片 {#13-passive-voice-and-subjectless-fragments}

**問題:** LLM は「No configuration file needed」「The results are preserved automatically」のような書き方で、動作の主を隠したり主語ごと落としたりします。能動態のほうが分かりやすく直接的になる場合は、書き直してください。

**修正前:**
> No configuration file needed. The results are preserved automatically.

**修正後:**
> You do not need a configuration file. The system preserves the results automatically.

## 体裁のパターン {#style-patterns}

### 14. em ダッシュの多用 {#14-em-dash-overuse}

**問題:** LLM は「歯切れのよい」宣伝文をまねて、em ダッシュ（—）を人間より多く使います。実際には、その多くはカンマ・ピリオド・括弧のほうがすっきり書けます。

**修正前:**
> The term is primarily promoted by Dutch institutions—not by the people themselves. You don't say "Netherlands, Europe" as an address—yet this mislabeling continues—even in official documents.

**修正後:**
> The term is primarily promoted by Dutch institutions, not by the people themselves. You don't say "Netherlands, Europe" as an address, yet this mislabeling continues in official documents.

### 15. 太字の多用 {#15-overuse-of-boldface}

**問題:** AI のチャットボットは、機械的に語句を太字で強調します。

**修正前:**
> It blends **OKRs (Objectives and Key Results)**, **KPIs (Key Performance Indicators)**, and visual strategy tools such as the **Business Model Canvas (BMC)** and **Balanced Scorecard (BSC)**.

**修正後:**
> It blends OKRs, KPIs, and visual strategy tools like the Business Model Canvas and Balanced Scorecard.

### 16. 見出し付きの箇条書き {#16-inline-header-vertical-lists}

**問題:** AI は、太字の見出しとコロンで始まる項目を並べた箇条書きを出しがちです。

**修正前:**
> - **User Experience:** The user experience has been significantly improved with a new interface.
> - **Performance:** Performance has been enhanced through optimized algorithms.
> - **Security:** Security has been strengthened with end-to-end encryption.

**修正後:**
> The update improves the interface, speeds up load times through optimized algorithms, and adds end-to-end encryption.

### 17. 見出しのタイトルケース {#17-title-case-in-headings}

**問題:** AI のチャットボットは、見出しの主要な語をすべて大文字で始めます。

**修正前:**
> ## Strategic Negotiations And Global Partnerships

**修正後:**
> ## Strategic negotiations and global partnerships

### 18. 絵文字 {#18-emojis}

**問題:** AI のチャットボットは、見出しや箇条書きを絵文字で飾りがちです。

**修正前:**
> 🚀 **Launch Phase:** The product launches in Q3
> 💡 **Key Insight:** Users prefer simplicity
> ✅ **Next Steps:** Schedule follow-up meeting

**修正後:**
> The product launches in Q3. User research showed a preference for simplicity. Next step: schedule a follow-up meeting.

### 19. 丸い引用符 {#19-curly-quotation-marks}

**問題:** ChatGPT は、まっすぐな引用符（"..."）ではなく丸い引用符（"..."）を使います。

**修正前:**
> He said "the project is on track" but others disagreed.

**修正後:**
> He said "the project is on track" but others disagreed.

## やりとりのパターン {#communication-patterns}

### 20. 会話の名残 {#20-collaborative-communication-artifacts}

**注意する語:** I hope this helps, Of course!, Certainly!, You're absolutely right!, Would you like..., let me know, here is a...

**問題:** チャットボットへの返答として書かれた部分が、そのまま本文として貼り付けられています。

**修正前:**
> Here is an overview of the French Revolution. I hope this helps! Let me know if you'd like me to expand on any section.

**修正後:**
> The French Revolution began in 1789 when financial crisis and food shortages led to widespread unrest.

### 21. 知識のカットオフに関する断り書き {#21-knowledge-cutoff-disclaimers}

**注意する語:** as of [date], Up to my last training update, While specific details are limited/scarce..., based on available information...

**問題:** 情報が足りないという AI の断り書きが、本文に残ったままになっています。

**修正前:**
> While specific details about the company's founding are not extensively documented in readily available sources, it appears to have been established sometime in the 1990s.

**修正後:**
> The company was founded in 1994, according to its registration documents.

### 22. へつらうような口調 {#22-sycophanticservile-tone}

**問題:** 過剰に前向きで、相手を持ち上げる言い方です。

**修正前:**
> Great question! You're absolutely right that this is a complex topic. That's an excellent point about the economic factors.

**修正後:**
> The economic factors you mentioned are relevant here.

## 冗長さとぼかし {#filler-and-hedging}

### 23. 冗長な言い回し {#23-filler-phrases}

**修正前 → 修正後:**
- "In order to achieve this goal" → "To achieve this"
- "Due to the fact that it was raining" → "Because it was raining"
- "At this point in time" → "Now"
- "In the event that you need help" → "If you need help"
- "The system has the ability to process" → "The system can process"
- "It is important to note that the data shows" → "The data shows"

### 24. 過剰なぼかし {#24-excessive-hedging}

**問題:** 但し書きを重ねすぎています。

**修正前:**
> It could potentially possibly be argued that the policy might have some effect on outcomes.

**修正後:**
> The policy may affect outcomes.

### 25. ありきたりな前向きの結び {#25-generic-positive-conclusions}

**問題:** 中身のない明るい締めくくりです。

**修正前:**
> The future looks bright for the company. Exciting times lie ahead as they continue their journey toward excellence. This represents a major step in the right direction.

**修正後:**
> The company plans to open two more locations next year.

### 26. ハイフンでつないだ語の多用 {#26-hyphenated-word-pair-overuse}

**注意する語:** third-party, cross-functional, client-facing, data-driven, decision-making, well-known, high-quality, real-time, long-term, end-to-end

**問題:** AI は、よくある二語の組み合わせを寸分の狂いなくハイフンでつなぎます。人間がこれらを一律にハイフンでつなぐことはまずなく、つなぐとしてもばらつきます。あまり見かけない語や技術的な複合修飾語なら、ハイフンでつないで構いません。

**修正前:**
> The cross-functional team delivered a high-quality, data-driven report on our client-facing tools. Their decision-making process was well-known for being thorough and detail-oriented.

**修正後:**
> The cross functional team delivered a high quality, data driven report on our client facing tools. Their decision making process was known for being thorough and detail oriented.

### 27. 権威ありげに聞かせる決まり文句 {#27-persuasive-authority-tropes}

**注意する言い回し:** The real question is, at its core, in reality, what really matters, fundamentally, the deeper issue, the heart of the matter

**問題:** LLM はこうした言い回しで、雑音を切り分けて深い真実に迫っているかのように見せますが、そのあとに続く文はたいてい、ごく普通のことを大げさに言い直しているだけです。

**修正前:**
> The real question is whether teams can adapt. At its core, what really matters is organizational readiness.

**修正後:**
> The question is whether teams can adapt. That mostly depends on whether the organization is ready to change its habits.

### 28. 前置きと予告 {#28-signposting-and-announcements}

**注意する言い回し:** Let's dive in, let's explore, let's break this down, here's what you need to know, now let's look at, without further ado

**問題:** LLM は、やる代わりに「これからこうします」と予告します。この自己説明は文章の進みを遅くし、チュートリアルの台本のような手触りにします。

**修正前:**
> Let's dive into how caching works in Next.js. Here's what you need to know.

**修正後:**
> Next.js caches data at multiple layers, including request memoization, the data cache, and the router cache.

### 29. 見出し直後の空回り {#29-fragmented-headers}

**注意するサイン:** 見出しのあとに、その見出しを言い直しただけの一行の段落が置かれ、そのあとで本題が始まる。

**問題:** LLM は見出しの直後に、話の助走として当たり障りのない一文を足しがちです。たいてい何も足しておらず、水増しされた印象になります。

**修正前:**
> ## Performance
>
> Speed matters.
>
> When users hit a slow page, they leave.

**修正後:**
> ## Performance
>
> When users hit a slow page, they leave.

## 文体・リズム・レトリックのパターン {#style-rhythm-and-rhetoric-patterns}

### 30. 無理な比喩と飾りすぎの表現 {#30-forced-metaphors-and-figurative-overwriting}

**注意するサイン:** 独創的だが無理のある比喩、混線した比喩、普通の語のほうが分かりやすい場面での比喩的な言い換え、使った直後に説明が付く比喩

**問題:** パターン 4 と 7 で挙げた既製の比喩表現に加えて、LLM は意味を足さずに絵だけを足す飾りの比喩を思いつき、そのあと説明までします。素直に書くほうが、たいてい分かりやすく誠実です。比喩がその場所に見合っていないなら、削ってそのまま書いてください。

**修正前:**
> The codebase is a garden we must tend, pruning dead branches and planting seeds of innovation so the whole ecosystem can flourish. In other words, delete unused code and add features.

**修正後:**
> Delete unused code and add the features users are asking for.

### 31. 大げさな断片化と決め台詞 {#31-dramatic-fragmentation-and-punchy-kickers}

**注意するサイン:** 演出のための主語のない二〜三語の文、「X. And Y. And Z.」と刻む連なり、段落や節のたびに置かれる短い引用向きの一行、かわいらしい同格の断片（「the catalog, honestly priced」）

**問題:** LLM は文を断片に刻んで嘘の強調を作り、節の最後を引用向きの決め台詞で締めます。広告のコピーか自己啓発のポスターのように読めます。ポスターに載っていそうな一行は、削るか、主語のあるまともな文に戻してください。これはパターン 13（文法上の受動態の話）とは別で、ここで手がかりになるのはリズムと見せ方であって、隠れた動作主ではありません。

**修正前:**
> The catalog, honestly priced. Pay for what it does. Not promises. It just works. Every time.

**修正後:**
> The catalog is priced by usage, so you pay for the calls you actually make rather than a flat monthly fee.

### 32. 自分ですぐ答える問いかけ {#32-rhetorical-questions-answered-immediately}

**注意するサイン:** 「What if...?」「The question is...」「Ever wondered...?」、問いのすぐあとに自分で答えている箇所、「Think about it.」

**問題:** LLM は問いを投げて、ひと呼吸おいて自分で答えます。その問いは情報を足さず、文の進みを止めるだけです。言いたいことをそのまま書いてください。

**修正前:**
> What makes an API good? It comes down to predictability. Think about it: developers want to know exactly what they will get back.

**修正後:**
> A good API is predictable, so developers know exactly what they will get back.

### 33. 文頭の癖 {#33-sentence-opener-tics}

**注意する語:** So..., Look,, 文頭に And/But を置く癖、事実を述べるときの「I think」「I believe」、副詞で始める形（Interestingly, Importantly, Notably, Crucially, Essentially, Ultimately）

**問題:** LLM は限られた文頭の型に頼ります。副詞で始める形は、読み手に感じ方を勝ち取らせるかわりに指示してしまいますし、「So」や「Look」は打ち解けた雰囲気を装うだけです。その前置きを落として、中身から始めてください。

**修正前:**
> So, the results were mixed. Interestingly, adoption went up. Importantly, churn went up too. I think that means the feature still needs work.

**修正後:**
> The results were mixed: adoption rose, but churn rose alongside it, so the feature still needs work.

### 34. 頼まれていない励まし {#34-reassurance-kickers}

**注意するサイン:** And that's okay., And that's fine., There's nothing wrong with that., no shame in..., you're not alone, it's completely normal

**問題:** LLM は、読み手が求めてもいない励ましを付け足します。文章がぼやけるうえ、読み手は慰めを必要としていると決めつけることになります。読み手を信じて、言うべきことを言ったら止まってください。

**修正前:**
> You might not have a testing setup yet. And that's okay. Plenty of teams start without one, and there's nothing wrong with that.

**修正後:**
> Many teams start without a testing setup and add one once regressions begin costing real time.

---

## 手順 {#process}

1. 入力されたテキストを注意深く読みます（ファイルなら `read_file` を使います）。
2. 上記のパターンに当たる箇所をすべて洗い出します。
3. 問題のある箇所をひとつずつ書き直します。
4. 直した文章が次を満たすか確かめます。
   - 声に出して読んで自然に聞こえる
   - 文の組み立てに自然な変化がある
   - あいまいな主張ではなく具体的な事実を使っている
   - 文脈にふさわしい調子を保っている
   - ふさわしい場面では単純な言い方（is/are/has）を使っている
5. 人間らしくした下書きを示します。
6. 自分に問いかけます。「下の文章は、なぜこんなにあからさまに AI 生成に見えるのか」
7. 残っている痕跡があれば短く答えます。
8. 自分に問いかけます。「では、あからさまに AI 生成には見えないようにする」
9. 点検を踏まえて直した最終版を示します。
10. テキストがファイル由来なら、`patch`（部分的に）か `write_file`（全体を書き直す）で反映し、何が変わったかを利用者に見せます。

## 出力の形式 {#output-format}

次を示してください。

1. 書き直しの下書き
2. 「下の文章は、なぜこんなにあからさまに AI 生成に見えるのか」（短い箇条書き）
3. 最終版
4. 変更点の短いまとめ（任意。役に立つ場合）

## 完全な例 {#full-example}

**修正前（AI っぽい）:**
> Great question! Here is an essay on this topic. I hope this helps!
>
> AI-assisted coding serves as an enduring testament to the transformative potential of large language models, marking a pivotal moment in the evolution of software development. In today's rapidly evolving technological landscape, these groundbreaking tools—nestled at the intersection of research and practice—are reshaping how engineers ideate, iterate, and deliver, underscoring their vital role in modern workflows.
>
> At its core, the value proposition is clear: streamlining processes, enhancing collaboration, and fostering alignment. It's not just about autocomplete; it's about unlocking creativity at scale, ensuring that organizations can remain agile while delivering seamless, intuitive, and powerful experiences to users. The tool serves as a catalyst. The assistant functions as a partner. The system stands as a foundation for innovation.
>
> Industry observers have noted that adoption has accelerated from hobbyist experiments to enterprise-wide rollouts, from solo developers to cross-functional teams. The technology has been featured in The New York Times, Wired, and The Verge. Additionally, the ability to generate documentation, tests, and refactors showcases how AI can contribute to better outcomes, highlighting the intricate interplay between automation and human judgment.
>
> - 💡 **Speed:** Code generation is significantly faster, reducing friction and empowering developers.
> - 🚀 **Quality:** Output quality has been enhanced through improved training, contributing to higher standards.
> - ✅ **Adoption:** Usage continues to grow, reflecting broader industry trends.
>
> While specific details are limited based on available information, it could potentially be argued that these tools might have some positive effect. Despite challenges typical of emerging technologies—including hallucinations, bias, and accountability—the ecosystem continues to thrive. In order to fully realize this potential, teams must align with best practices.
>
> In conclusion, the future looks bright. Exciting times lie ahead as we continue this journey toward excellence. Let me know if you'd like me to expand on any section!

**書き直しの下書き:**
> AI coding assistants speed up some tasks. In a 2024 study by Google, developers using Codex completed simple functions 55% faster than a control group, but showed no improvement on debugging or architectural decisions.
>
> The tools are good at boilerplate: config files, test scaffolding, repetitive refactors. They are bad at knowing when they are wrong. I have mass-accepted suggestions that compiled, passed lint, and still did the wrong thing because I stopped paying attention.
>
> Mira, an engineer at a fintech startup I interviewed, said she uses Copilot "like autocomplete for boring code" but reviews every line before committing. Jake, a senior dev at a larger company, disabled it after it kept suggesting patterns from a deprecated internal library.
>
> The productivity claims are hard to verify. GitHub says Copilot users "accept 30% of suggestions," but acceptance is not correctness, and correctness is not value. The 2024 Uplevel study found no statistically significant difference in pull-request throughput between teams with and without AI assistants.
>
> None of this means the tools are useless. It means they are tools. They do not replace judgment, and they do not eliminate the need for tests. If you do not have tests, you cannot tell whether the suggestion is right.

**下の文章は、なぜこんなにあからさまに AI 生成に見えるのか**
- リズムがまだ整いすぎている（対比がきれいで、段落の歩幅も均一）。
- 人名や研究の引用が、実在して出典をたどれるものでない限り、それらしく作った穴埋めに読める。
- 締めがやや標語じみている（「If you do not have tests...」）。人が話しているようには聞こえない。

**では、あからさまに AI 生成には見えないようにする**
> AI coding assistants can make you faster at the boring parts. Not everything. Definitely not architecture.
>
> They're great at boilerplate: config files, test scaffolding, repetitive refactors. They're also great at sounding right while being wrong. I've accepted suggestions that compiled, passed lint, and still missed the point because I stopped paying attention.
>
> People I talk to tend to land in two camps. Some use it like autocomplete for chores and review every line. Others disable it after it keeps suggesting patterns they don't want. Both feel reasonable.
>
> The productivity metrics are slippery. GitHub can say Copilot users "accept 30% of suggestions," but acceptance isn't correctness, and correctness isn't value. If you don't have tests, you're basically guessing.

**変更点:**
- チャットボットの名残を削除（"Great question!"、"I hope this helps!"、"Let me know if..."）
- 意義の水増しを削除（"testament"、"pivotal moment"、"evolving landscape"、"vital role"）
- 宣伝的な言葉づかいを削除（"groundbreaking"、"nestled"、"seamless, intuitive, and powerful"）
- あいまいな出典を削除（"Industry observers"）
- 薄い -ing の句を削除（"underscoring"、"highlighting"、"reflecting"、"contributing to"）
- 否定の対句を削除（"It's not just X; it's Y"）
- 三つ並べと同義語の使い回しを削除（"catalyst/partner/foundation"）
- 意味のない範囲表現を削除（"from X to Y, from A to B"）
- em ダッシュ、絵文字、太字の見出し、丸い引用符を削除
- コピュラ回避（"serves as"、"functions as"、"stands as"）をやめて "is"/"are" に戻した
- 判で押したような課題の節を削除（"Despite challenges... continues to thrive"）
- 知識のカットオフに関するぼかしを削除（"While specific details are limited..."）
- 過剰なぼかしを削除（"could potentially be argued that... might have some"）
- 冗長な言い回しと権威ありげな枠組みを削除（"In order to"、"At its core"）
- ありきたりな前向きの結びを削除（"the future looks bright"、"exciting times lie ahead"）
- 声をより個人的にし、寄せ集め感を減らした（リズムに変化を付け、穴埋めめいた記述を減らした）

## 出典 {#attribution}

この skill は [blader/humanizer](https://github.com/blader/humanizer)（MIT ライセンス）を移植したもので、そのもとは WikiProject AI Cleanup が管理する [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) です。そこに書かれたパターンは、Wikipedia 上で AI が生成した文章の何千という実例の観察から得られています。

原作者は Siqi Chen（[@blader](https://github.com/blader)）。原典のリポジトリは https://github.com/blader/humanizer（バージョン 2.5.1）です。Hermes Agent への移植にあたって、ツールの呼び名を Hermes のもの（`read_file`、`patch`、`write_file`）に置き換え、この skill をいつ読み込むかの指針を足しました。もとの 29 のパターンは原典から来ており、修正前後の例（完全な例も含む）は実演としてそのまま残しています。パターン 30〜34 と、パターン 7 に足した「マーケティングやブログの決まり文句」の一覧は Hermes による追加で、原典には含まれません。この skill 自身の説明文も、自らの指針に沿うよう軽く手を入れてあります（たとえば地の文から em ダッシュと否定の対句を取り除きました）。求める書き方を、skill 自身が体現するためです。原典の MIT ライセンスは、この `SKILL.md` と並べて `LICENSE` ファイルに残してあります。

Wikipedia からの要点の引用: 「LLM は統計的なアルゴリズムで次に来るものを推測する。その結果は、もっとも幅広い場面に当てはまる、統計的にもっともありそうなものへ寄っていく」
