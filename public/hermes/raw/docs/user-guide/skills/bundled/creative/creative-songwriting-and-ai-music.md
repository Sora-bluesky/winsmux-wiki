---
title: "Songwriting And Ai Music — 作詞作曲の技法と Suno の AI 音楽プロンプト"
description: "作詞作曲の技法と Suno の AI 音楽プロンプト"
upstream_path: user-guide/skills/bundled/creative/creative-songwriting-and-ai-music.md
upstream_blob: f2270be8e25d11e7d8ca6d0d9f18630f4ca10947
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-songwriting-and-ai-music
---

# Songwriting And Ai Music {#songwriting-and-ai-music}

作詞作曲の技法と、Suno の AI 音楽プロンプトを扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative\songwriting-and-ai-music` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# 作詞作曲と AI 音楽生成 {#songwriting-ai-music-generation}

ここに書いてあるものはすべて目安であって、規則ではありません。
芸術は意図して規則を破ります。曲のためになるものを使い、ならないものは無視してください。

---

## 1. 曲の構成（ひとつ選ぶか、自分で考える） {#1-song-structure-pick-one-or-invent-your-own}

よくある骨組みです。混ぜても、変えても、捨ててもかまいません。

```
ABABCB  Verse/Chorus/Verse/Chorus/Bridge/Chorus    (most pop/rock)
AABA    Verse/Verse/Bridge/Verse (refrain-based)    (jazz standards, ballads)
ABAB    Verse/Chorus alternating                    (simple, direct)
AAA     Verse/Verse/Verse (strophic, no chorus)     (folk, storytelling)
```

6 つの構成要素です。
- Intro      — 雰囲気を決め、聴き手を引き込む
- Verse      — 物語、細部、世界のつくり込み
- Pre-Chorus — サビ前に緊張を高める、任意の助走
- Chorus     — 感情の中心。人が覚えて帰る部分
- Bridge     — 寄り道。視点や調の切り替え
- Outro      — 別れの挨拶。ここまでを反響させても、裏切ってもよい

全部そろえる必要はありません。名曲のなかには、ひとつの部分が
変化していくだけのものもあります。構成は感情のためにあり、逆ではありません。

---

## 2. 韻、韻律、響き {#2-rhyme-meter-and-sound}

韻の種類（きっちりした順から緩い順へ）:
- 完全韻: lean/mean
- 近縁韻: crate/braid
- 母音韻: had/glass（母音は同じ、語尾は違う）
- 子音韻: scene/when（母音は違う、語尾が似ている）
- 半韻・ずらし韻: つながりを感じさせるだけで、固定はしない程度

これらを混ぜてください。完全韻ばかりだと童謡のように聞こえます。
ずらし韻ばかりだと手抜きに聞こえます。良さは混ぜ具合にあります。

行中韻: 行末だけでなく、行のなかで韻を踏むことです。
  「We pruned the lies from bleeding trees / Distilled the storm
   from entropy」— "lies/flies"、"trees/entropy" が行の内側で響き合います。

韻律: 強い音節と弱い音節が作るリズムです。
- 対になる行どうしで音節数をそろえると、歌いやすくなります
- 合計の音節数より、強く読む音節のほうが重要です
- 声に出してください。つまずくなら韻律に手を入れる必要があります
- わざと韻律を崩すと、強調や意外性を作れます

---

## 3. 感情の起伏とダイナミクス {#3-emotional-arc-and-dynamics}

曲は平坦な道ではなく、旅だと考えてください。

エネルギーの配分（おおよその目安で、決まりではありません）:
  Intro: 2-3  |  Verse: 5-6  |  Pre-Chorus: 7
  Chorus: 8-9  |  Bridge: varies  |  Final Chorus: 9-10

ダイナミクスでいちばん効くのはコントラストです。
- 叫び続けるより、ささやきのあとの叫びのほうが刺さります
- 密の前に疎を。速の前に遅を。高の前に低を。
- 落としが効くのは、その前に積み上げたからです
- 沈黙もひとつの楽器です

「ささやきから咆哮へ、そしてまたささやきへ」— 内輪な音量で始め、全力まで
積み上げ、最後は無防備なところまで削ぎ落とします。バラードにも、大作にも、
アンセムにも効きます。

---

## 4. 効く歌詞の書き方 {#4-writing-lyrics-that-work}

語らずに見せる（たいていの場合）:
- 「悲しかった」= 平板
- 「きみのパーカーがまだドアのフックに掛かっている」= 生きている
- ただし「この命をあげる」と言い切ることが力になる場合もあります

フック:
- 人が覚え、口ずさみ、繰り返す一行
- たいていはタイトルか、中心になる言い回し
- メロディー・歌詞・感情がそろったときにいちばん効きます
- いちばん刺さる場所に置きます（多くはサビの最初か最後の行）

プロソディ — 歌詞と音楽が互いを支えること:
- 安定した感情（解決、平穏）は、落ち着いたメロディー、完全韻、
  解決したコードと合います
- 不安定な感情（憧れ、迷い）は、さまようメロディー、半韻、
  解決しないコードと合います
- Verse のメロディーは低め、Chorus は高めが基本です
- ただし曲のためになるなら、逆にしてかまいません

避けること（意図してやる場合を除く）:
- 惰性で使う決まり文句（積み上げのない「黄金の心」など）
- 韻に合わせるために語順をねじ曲げること（ヨーダ語）
- どの部分も同じ熱量にすること（起伏が消えます）
- 初稿を神聖視すること — 書き直しもまた創作です

---

## 5. 替え歌と翻案 {#5-parody-and-adaptation}

既存の曲に新しい歌詞を付けるときは、こう進めます。

骨組み: まず原曲の構造を書き出します。
- 行ごとの音節数を数えます
- 韻の並び（ABAB、AABB など）を書き留めます
- どの音節を強く読むかを見分けます
- 伸ばす音がどこに来るかを控えておきます

新しい言葉のはめ方:
- 強く読む音節を、原曲と同じ拍に合わせます
- 合計の音節数は、弱い音節 1〜2 個分なら伸び縮みできます
- 長く伸ばす音では、原曲の母音に合わせるようにします
  （原曲が「LOOOVE」を「oo」の母音で伸ばすなら、「LIFE」より
   「FOOOD」のほうがはまります）
- 要所を 1 音節の語で置き換えると、リズムが崩れません
  （Crime -> Code、Snake -> Noose）
- 新しい歌詞を原曲に乗せて歌ってください。つまずいたら直します

着想:
- 1 曲を通して持ちこたえるだけの強い着想を選びます
- タイトルやフックから始めて、外へ広げます
- まず材料（言葉遊び、言い回し、情景）を大量に出し、
  そのあとで良いものを構造にはめ込みます
- 特定の一行をどこかに入れたいなら、韻の並びを逆算して
  そこへ着地するように仕込みます

原曲を少し残す: 元の行や構造をいくらか残しておくと、原曲だと分かりやすくなり、
聴き手はつながりを感じられます。

---

## 6. Suno のプロンプト設計 {#6-suno-ai-prompt-engineering}

### スタイル／ジャンルの記述欄 {#stylegenre-description-field}

型（必要に応じて崩してください）:
  ジャンル + 雰囲気 + 年代 + 楽器 + 歌い方 + 音作り + ダイナミクス

```
BAD:  "sad rock song"
GOOD: "Cinematic orchestral spy thriller, 1960s Cold War era, smoky
       sultry female vocalist, big band jazz, brass section with
       trumpets and french horns, sweeping strings, minor key,
       vintage analog warmth"
```

ジャンルだけでなく、曲の道のりを書いてください:
```
"Begins as a haunting whisper over sparse piano. Gradually layers
 in muted brass. Builds through the chorus with full orchestra.
 Second verse erupts with raw belting intensity. Outro strips back
 to a lone piano and a fragile whisper fading to silence."
```

コツ:
- V4.5 以降のスタイル欄は 1,000 字まで使えます。使い切ってください
- アーティスト名や商標は書きません。音そのものを説明します
  「James Bond style」ではなく「1960s Cold War spy thriller brass」
  「Nirvana-style」ではなく「90s grunge」
- BPM や調にこだわりがあるなら指定します
- 入れたくないものは Exclude Styles 欄に書きます
- 意外なジャンルの掛け合わせが当たることがあります:「bossa nova trap」
  「Appalachian gothic」「chiptune jazz」
- 性別だけでなく、歌い手の人物像を作ります:
  「A weathered torch singer with a smoky alto, slight rasp,
   who starts vulnerable and builds to devastating power」

### メタタグ（歌詞欄のなかに [角括弧] で書きます） {#metatags-place-in-brackets-inside-lyrics-field}

構成:
  [Intro] [Verse] [Verse 1] [Pre-Chorus] [Chorus]
  [Post-Chorus] [Hook] [Bridge] [Interlude]
  [Instrumental] [Instrumental Break] [Guitar Solo]
  [Breakdown] [Build-up] [Outro] [Silence] [End]

歌い方:
  [Whispered] [Spoken Word] [Belted] [Falsetto] [Powerful]
  [Soulful] [Raspy] [Breathy] [Smooth] [Gritty]
  [Staccato] [Legato] [Vibrato] [Melismatic]
  [Harmonies] [Choir] [Harmonized Chorus]

ダイナミクス:
  [High Energy] [Low Energy] [Building Energy] [Explosive]
  [Emotional Climax] [Gradual swell] [Orchestral swell]
  [Quiet arrangement] [Falling tension] [Slow Down]

性別:
  [Female Vocals] [Male Vocals]

雰囲気:
  [Melancholic] [Euphoric] [Nostalgic] [Aggressive]
  [Dreamy] [Intimate] [Dark Atmosphere]

効果音:
  [Vinyl Crackle] [Rain] [Applause] [Static] [Thunder]

タグはスタイル欄と歌詞欄の両方に書いて念を押します。
1 セクションあたり 5〜8 個までにしてください。多すぎると AI が混乱します。
矛盾させないでください（同じセクションに [Calm] と [Aggressive] を入れるなど）。

### カスタムモード {#custom-mode}
- 本気で作るときは必ずカスタムモードを使います（スタイル欄と歌詞欄が分かれます）
- 歌詞欄の上限は約 3,000 字（およそ 40〜60 行）です
- 構成タグは必ず入れてください。ないと Suno は起伏のない
  Verse／Chorus／Verse を既定で出してきます

---

## 7. AI 歌手向けの発音の小技 {#7-phonetic-tricks-for-ai-singers}

AI の歌手は文字を読むのではなく、発音します。手助けしてください。

音に合わせたつづり直し:
- 聞こえたとおりにつづります:「through」-> 「thru」
- 固有名詞がいちばん失敗しやすいので、早めに試してください
- 「Nous」->「Noose」（正しい発音を強制できます）
- 音節を導くためにハイフンを入れます:「Re-search」「bio-engineering」

歌わせ方の指定:
- 全部大文字 = より大きく、強く
- 母音を伸ばす:「lo-o-o-ove」= ロングトーン／メリスマ
- 三点リーダー:「I... need... you」= ためを作る
- ハイフンで伸ばす:「ne-e-ed」= 感情を込めて引き伸ばす

必ず守ること:
- 数字は言葉で書きます:「24/7」->「twenty four seven」
- 頭字語は離します:「AI」->「A I」または「A-I」
- 固有名詞や珍しい語は、まず 30 秒の短いクリップで試します
- いったん生成すると発音は固定されます。先に歌詞側で直してください

---

## 8. 作業の流れ {#8-workflow}

1. まず着想とフックを書く — 感情の中心は何か
2. 翻案なら、原曲の構造（音節、韻、強勢）を書き出す
3. 材料を出す — 構造にはめる前に自由に思いつくままに
4. 構造に沿って歌詞を書く
5. 声に出して読む・歌う — つまずきを見つけて韻律を直す
6. Suno のスタイル欄を書く — 起伏の道のりを描く
7. 歌わせ方を指定するメタタグを歌詞に入れる
8. 最低でも 3〜5 通り生成する — レコーディングのテイクだと思ってください
9. いちばん良いものを選び、Extend／Continue で良い部分を伸ばす
10. 偶然良いものが生まれたら、そのまま残す

見込み: 良い結果 1 つにつき生成 3〜5 回くらいです。やり直しは普通のことです。
Extend するとスタイルがずれることがあるので、そのつどジャンルと雰囲気を書き直してください。

---

## 9. 分かってきたこと {#9-lessons-learned}

- スタイル欄に起伏の道のりを書くことは、ジャンルを並べることより
  はるかに効きます。「ささやきから咆哮へ、そしてまたささやきへ」は
  Suno に演奏の地図を渡すことになります。
- 替え歌で元の行をいくらか残すと、原曲だと分かりやすくなり、
  感情の重みも増します。聴き手は原曲の影を感じ取ります。
- 曲の Bridge は、イメージを変身させられる場所です。
  感情の役割（内省、転換、気づき）を保ったまま、原曲の具体的な言及を
  自分のテーマの比喩に入れ替えてください。
- フックやタグでの 1 音節の入れ替えは、リズムを保ったまま意味を
  変えるいちばんきれいな手です。
- スタイル欄に書く歌い手の人物像は、どのメタタグ 1 個よりも
  大きな違いを生みます。
- 規則にこだわりすぎないでください。韻律を崩す一行のほうが刺さるなら、
  そのまま残します。大事なのは伝わる感情です。技法は芸術のためにあり、
  逆ではありません。

---

## 10. ローカル／オープンソースでの音楽生成 {#10-local-open-source-music-generation}

Suno の代わりに手元の GPU で生成したい場合は、任意で導入できる skill が
2 つあります（依存関係が重いので、最初からは入っていません）。

- **heartmula** — 歌詞とタグからボーカル入りの曲を丸ごと作ります
  （オープンソースの Suno 代替。VRAM 8〜16GB）:
  `hermes skills install official/creative/heartmula`
- **audiocraft** — Meta の MusicGen（テキストから器楽曲）と
  AudioGen（効果音）です:
  `hermes skills install official/creative/audiocraft-audio-generation`

この skill にある作詞とプロンプトの技法は heartmula にもそのまま使えます。
入力の形式は、角括弧の構成タグを添えた歌詞と、カンマ区切りのスタイルタグです。
