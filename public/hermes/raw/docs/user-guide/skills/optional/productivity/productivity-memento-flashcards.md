---
title: "Memento Flashcards — 間隔反復の暗記カード: 作成・復習・クイズ・書き出し"
description: "間隔反復の暗記カード: 作成・復習・クイズ・書き出し"
upstream_path: user-guide/skills/optional/productivity/productivity-memento-flashcards.md
upstream_blob: f2d0df28d33a4178b9f06327039be19705511bf7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-memento-flashcards
---

# Memento Flashcards {#memento-flashcards}

間隔反復の暗記カードを作り、復習し、クイズにして、書き出します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/productivity/memento-flashcards` で入れます |
| パス | `optional-skills/productivity\memento-flashcards` |
| バージョン | `1.0.0` |
| 作者 | Memento AI |
| ライセンス | MIT |
| 対応プラットフォーム | macos, linux |
| タグ | `Education`, `Flashcards`, `Spaced Repetition`, `Learning`, `Quiz`, `YouTube` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Memento Flashcards — 間隔反復の暗記カード skill {#memento-flashcards-spaced-repetition-flashcard-skill}

## 概要 {#overview}

Memento は、間隔反復のスケジュールを持った、ファイルベースの暗記カードをローカルに用意します。
使う人は自由な文章で答えられ、エージェントがその答えを採点してから次の復習日を決めます。
次のようなときに使います。

- **事実を覚えたい** — どんな文でも Q/A のカードに変えます
- **間隔反復で勉強したい** — 期限が来たカードを、間隔を調整しながら、自由記述をエージェントが採点する形で復習します
- **YouTube の動画からクイズを出したい** — 字幕を取ってきて、5 問のクイズを作ります
- **デッキを整理したい** — カードをまとまりごとに分け、CSV で書き出し・読み込みします

カードのデータは、すべて1つの JSON ファイルに入ります。外部の API キーは不要です。カードの中身もクイズの問題も、エージェントであるあなたが直接作ります。

Memento Flashcards での返答の書き方:
- プレーンテキストだけを使います。返答に Markdown の書式を使ってはいけません。
- 復習やクイズのフィードバックは短く、淡々と。褒めすぎや励まし、長い説明は避けます。

## 使いどころ {#when-to-use}

次のようなときに使います。
- あとで復習するために事実をカードとして保存したい
- 期限の来たカードを間隔反復で復習したい
- YouTube の字幕からクイズを作りたい
- カードのデータを読み込む・書き出す・確認する・削除する

一般的な質問応答、コーディングの相談、記憶に関係のない作業には使いません。

## 早見表 {#quick-reference}

| 相手のしたいこと | すること |
|---|---|
| 「X を覚えておいて」「これをカードにして」 | Q/A のカードを作り、`memento_cards.py add` を呼ぶ |
| カードに触れずに事実だけを送ってきた | 「これを Memento のカードとして保存しますか？」と聞き、了解が取れたときだけ作る |
| 「カードを作って」 | 質問・答え・まとまりの名前を聞き、`memento_cards.py add` を呼ぶ |
| 「カードを復習したい」 | `memento_cards.py due` を呼び、1枚ずつ出す |
| 「[YouTube URL] でクイズを出して」 | `youtube_quiz.py fetch VIDEO_ID` を呼び、5 問を作り、`memento_cards.py add-quiz` を呼ぶ |
| 「カードを書き出して」 | `memento_cards.py export --output PATH` を呼ぶ |
| 「CSV からカードを読み込んで」 | `memento_cards.py import --file PATH --collection NAME` を呼ぶ |
| 「統計を見せて」 | `memento_cards.py stats` を呼ぶ |
| 「カードを消して」 | `memento_cards.py delete --id ID` を呼ぶ |
| 「まとまりごと消して」 | `memento_cards.py delete-collection --collection NAME` を呼ぶ |

## カードの保存先 {#card-storage}

カードは次の JSON ファイルに保存されます。

```
~/.hermes/skills/productivity/memento-flashcards/data/cards.json
```

**このファイルを直接編集してはいけません。** 必ず `memento_cards.py` のサブコマンドを使ってください。スクリプトのほうは、一時ファイルに書いてから置き換える形で、壊れないように書き込みます。

ファイルは、初回に使ったときに自動で作られます。

## 手順 {#procedure}

### 事実からカードを作る {#creating-cards-from-facts}

### 発動のルール {#activation-rules}

事実を述べた文が、すべてカードになるべきとは限りません。次の3段階で判断します。

1. **はっきりした意思** — 「memento」「フラッシュカード」「これを覚えて」「このカードを保存」「カードを追加」など、カードを求めているのが明らかな言い方 → **確認なしでそのまま作ります**。
2. **暗黙の意思** — カードに触れずに事実だけを送ってきた場合（例:「光の速さは秒速 299,792 km」）→ **先に聞きます**。「これを Memento のカードとして保存しますか？」 了解が取れたときだけ作ります。
3. **意思なし** — コーディングの依頼、質問、指示、ふつうの会話など、覚えるべき事実ではないことが明らかなもの → **この skill をまったく使いません**。ほかの skill や通常の動きに任せます。

発動すると決まったら（1 なら直接、2 なら確認のあとで）、カードを作ります。

**手順 1:** その文を Q/A の組に変えます。内部では次の形式を使います。

```
Turn the factual statement into a front-back pair.
Return exactly two lines:
Q: <question text>
A: <answer text>

Statement: "{statement}"
```

ルール:
- 質問は、肝心の事実を思い出せるかを試すものにします
- 答えは短く、ずばりと書きます

**手順 2:** スクリプトを呼んでカードを保存します。

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py add \
  --question "What year did World War 2 end?" \
  --answer "1945" \
  --collection "History"
```

まとまりの指定がなければ、既定の `"General"` を使います。

スクリプトは、作られたカードを示す JSON を出力します。

### 手動でカードを作る {#manual-card-creation}

カードを作ってほしいとはっきり言われたときは、次を聞きます。
1. 質問（カードの表）
2. 答え（カードの裏）
3. まとまりの名前（任意。既定は `"General"`）

そのうえで、上と同じように `memento_cards.py add` を呼びます。

### 期限の来たカードを復習する {#reviewing-due-cards}

復習したいと言われたら、期限の来たカードをすべて取ってきます。

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py due
```

`next_review_at <= now` のカードが JSON の配列で返ります。まとまりで絞りたいときは次のようにします。

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py due --collection "History"
```

**復習の流れ（自由記述の採点）:**

以下が、必ず守ってほしいやりとりの見本です。相手が答え、あなたが採点し、正解を伝え、そのうえでカードを評価します。

**やりとりの例:**

> **エージェント:** ベルリンの壁が崩壊したのは何年ですか？
>
> **相手:** 1991 年
>
> **エージェント:** 惜しいです。ベルリンの壁が崩壊したのは 1989 年です。次の復習は明日です。
> *(エージェントが呼ぶコマンド: memento_cards.py rate --id ABC --rating hard --user-answer "1991")*
>
> 次の問題です。人類で最初に月面を歩いたのは誰ですか？

**ルール:**

1. 質問だけを見せ、相手の答えを待ちます。
2. 答えを受け取ったら、想定していた答えと比べて採点します。
   - **correct** → 肝心の事実が合っている（言い回しが違っていても可）
   - **partial** → 方向は合っているが、核心が抜けている
   - **incorrect** → 間違い、または的外れ
3. **正解と出来ばえを必ず伝えます。** 短く、プレーンテキストで。次の形式を使います。
   - correct: 「正解です。答え: &#123;answer&#125;。次の復習は 7 日後です。」
   - partial: 「惜しいです。答え: &#123;answer&#125;。&#123;what they missed&#125;。次の復習は 3 日後です。」
   - incorrect: 「惜しいです。答え: &#123;answer&#125;。次の復習は明日です。」
4. そのうえで rate コマンドを呼びます。correct→easy、partial→good、incorrect→hard です。
5. それから次の問題を出します。

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py rate \
  --id CARD_ID --rating easy --user-answer "what the user said"
```

**手順 3 を飛ばしてはいけません。** 次に進む前に、正解とフィードバックを必ず見せます。

期限の来たカードがなければ、こう伝えます。「今すぐ復習するカードはありません。またあとで見てください。」

**打ち切りの指示:** 「このカードは終わりにして」と言われたら、いつでもそのカードを復習から完全に外せます。その場合は `--rating retire` を使います。

### 間隔反復のアルゴリズム {#spaced-repetition-algorithm}

評価によって、次の復習までの間隔が決まります。

| 評価 | 間隔 | ease_streak | 状態の変化 |
|---|---|---|---|
| **hard** | +1 日 | 0 に戻る | learning のまま |
| **good** | +3 日 | 0 に戻る | learning のまま |
| **easy** | +7 日 | +1 | ease_streak >= 3 なら retired へ |
| **retire** | 恒久 | 0 に戻る | retired へ |

- **learning**: 復習の対象に入っているカード
- **retired**: 復習に出てこないカード（覚えきったか、手動で外したもの）
- 「easy」が 3 回続くと、そのカードは自動で retired になります

### YouTube のクイズを作る {#youtube-quiz-generation}

YouTube の URL を送られ、クイズを求められたときの手順です。

**手順 1:** URL から動画 ID を取り出します（例: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` から `dQw4w9WgXcQ`）。

**手順 2:** 字幕を取得します。

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/youtube_quiz.py fetch VIDEO_ID
```

`{"title": "...", "transcript": "..."}` かエラーが返ります。

スクリプトが `missing_dependency` を返したら、次を入れてもらうよう伝えます。
```bash
pip install youtube-transcript-api
```

**手順 3:** 字幕から 5 問を作ります。ルールは次のとおりです。

```
You are creating a 5-question quiz for a podcast episode.
Return ONLY a JSON array with exactly 5 objects.
Each object must contain keys 'question' and 'answer'.

Selection criteria:
- Prioritize important, surprising, or foundational facts.
- Skip filler, obvious details, and facts that require heavy context.
- Never return true/false questions.
- Never ask only for a date.

Question rules:
- Each question must test exactly one discrete fact.
- Use clear, unambiguous wording.
- Prefer What, Who, How many, Which.
- Avoid open-ended Describe or Explain prompts.

Answer rules:
- Each answer must be under 240 characters.
- Lead with the answer itself, not preamble.
- Add only minimal clarifying detail if needed.
```

字幕の先頭 15,000 文字を材料にします。問題を作るのは、LLM であるあなた自身です。

**手順 4:** 出力が正しい JSON で、ちょうど 5 件あり、それぞれの `question` と `answer` が空でない文字列かを確認します。確認に失敗したら、1 回だけやり直します。

**手順 5:** クイズのカードを保存します。

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py add-quiz \
  --video-id "VIDEO_ID" \
  --questions '[{"question":"...","answer":"..."},...]' \
  --collection "Quiz - Episode Title"
```

スクリプトは `video_id` で重複を弾きます。その動画のカードがすでにあれば、作成を飛ばして既存のカードを返します。

**手順 6:** 同じ自由記述の採点の流れで、問題を1問ずつ出します。
1. 「Question 1/5: ...」と見せて、相手の答えを待ちます。答えそのものや、答えを見せてもらえそうなヒントを含めてはいけません。
2. 相手が自分の言葉で答えるのを待ちます
3. 採点の手引き（「期限の来たカードを復習する」の節）に沿って採点します
4. **重要: 次に進む前に、必ずフィードバックを返します。** 評価、正解、次の復習日を見せます。黙って次の問題に進んではいけません。短く、プレーンテキストで。例: 「惜しいです。答え: &#123;answer&#125;。次の復習は明日です。」
5. **フィードバックを見せたあとで**、rate コマンドを呼び、同じメッセージの中で次の問題を出します。
```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py rate \
  --id CARD_ID --rating easy --user-answer "what the user said"
```
6. これを繰り返します。どの答えにも、次の問題の前に必ず目に見えるフィードバックを返します。

### CSV の書き出しと読み込み {#exportimport-csv}

**書き出し:**
```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py export \
  --output ~/flashcards.csv
```

`question,answer,collection` の 3 列の CSV ができます（ヘッダー行はありません）。

**読み込み:**
```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py import \
  --file ~/flashcards.csv \
  --collection "Imported"
```

question、answer、そして任意で collection（3 列目）を持つ CSV を読みます。collection の列がなければ、`--collection` の引数を使います。

### 統計 {#statistics}

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py stats
```

次を含む JSON が返ります。
- `total`: カードの総数
- `learning`: 復習の対象に入っているカード
- `retired`: 覚えきったカード
- `due_now`: 今まさに期限が来ているカード
- `collections`: まとまりごとの内訳

## つまずきやすいところ {#pitfalls}

- **`cards.json` を直接編集しないこと** — データが壊れないよう、必ずスクリプトのサブコマンドを使います
- **字幕が取れないことがある** — 英語の字幕がない動画や、字幕が無効になっている動画があります。そのことを伝えて、別の動画を提案してください
- **任意の依存パッケージ** — `youtube_quiz.py` には `youtube-transcript-api` が必要です。入っていなければ `pip install youtube-transcript-api` を実行してもらいます
- **大きな読み込み** — 数千行の CSV でも問題なく読めますが、JSON の出力が長くなります。結果は要約して伝えてください
- **動画 ID の取り出し** — `youtube.com/watch?v=ID` と `youtu.be/ID` の両方の形式に対応します

## 動作確認 {#verification}

補助スクリプトを直接動かして確かめます。

```bash
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py stats
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py add --question "Capital of France?" --answer "Paris" --collection "General"
python3 ~/.hermes/skills/productivity/memento-flashcards/scripts/memento_cards.py due
```

リポジトリのチェックアウトから試すときは、次を実行します。

```bash
pytest tests/skills/test_memento_cards.py tests/skills/test_youtube_quiz.py -q
```

エージェントとしての確認:
- 復習を始めて、フィードバックがプレーンテキストで短く、次のカードの前に必ず正解が入っているかを確かめます
- YouTube のクイズを一通り流して、どの答えにも次の問題の前に目に見えるフィードバックが返るかを確かめます
