---
title: "Simple English — 技術文書を ASD-STE100 の簡易技術英語に書き直す"
description: "技術文書を ASD-STE100 の簡易技術英語に書き直す"
upstream_path: user-guide/skills/optional/creative/creative-simple-english.md
upstream_blob: a00e0623c8811a9e3f42a871023b375c764ab34e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-simple-english
---

# Simple English {#simple-english}

技術文書を ASD-STE100 の簡易技術英語に書き直します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/simple-english` で入れます |
| パス | `optional-skills/creative\simple-english` |
| バージョン | `1.2.0` |
| 作者 | AminBlg (https://github.com/AminBlg/SimpleEnglish), ported by Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `writing`, `documentation`, `ste`, `asd-ste100`, `technical-writing`, `editing`, `anti-ai-slop` |
| 関連 skill | [`humanizer`](/hermes/docs/user-guide/skills/bundled/creative/creative-humanizer/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Simple English: 航空機の整備マニュアルのように書く {#simple-english-write-like-an-aerospace-manual}

ASD-STE100 簡易技術英語の決まりに沿って技術文書を書きます。STE は、航空宇宙と防衛の製造業が整備の文書に使っている、語彙と文法を絞った言語です。この決まりは、英語を母語としない疲れた読み手が指示を読み違えないために作られました。その副産物として、AI が書いた文章にありがちな特徴 — 長い文、同義語の言い換え、ぼかし、埋め草、飾りの節 — が消えます。

その疲れた読み手に向けて書いてください。どの文も、一度読めば分かるものでなければいけません。

## Hermes での使い方 {#how-to-use-it-in-hermes}

対象の文章は、たいてい次の 3 通りのいずれかで渡されます。

1. **メッセージに直接。** 相手が文章をメッセージに貼り付けてきます。その場で書き直し、結果を返します。
2. **ファイル。** 相手がファイル（README、運用手順書、ドキュメントのページ）を指します。`read_file` で読み込み、節ごとの書き直しなら `patch`、全面的な書き直しなら `write_file` を使います。コードブロック、識別子、引用されたエラーには絶対に手を触れないでください（「触れてはいけないもの」を参照）。
3. **点検だけ。** 書き直しではなく、STE に沿っているかを点検してほしいと頼まれます。`references/checklist.md` を使い、違反ごとに「決まりの番号＋問題のある箇所＋沿った書き直し」の形で報告します。

この skill は `humanizer` とは別物です。humanizer は人間らしい自然な声を取り戻すもので、simple-english は技術的な指示のために語彙と文法を絞った言語を守らせるものです。ドキュメント、運用手順書、エラーメッセージにはこちらを使ってください。ブログ記事、随筆、個人的な文章には humanizer を使います。同じ文章に両方をかけてはいけません。

## やるべきこと {#your-task}

技術文書を書く、または書き直すよう頼まれたら、次のようにします。

1. **どちらの構えで臨むかを選びます**（下記の実用重視か厳格か）。
2. **一つひとつの文章を、手順か説明かに分類します。** 他の決まりはすべてこの分類の上に成り立っています。
3. **書き始める前に語彙を決めます。** 厳格な構えでは、check／verify／confirm／ensure に当たる概念には `make sure that` を使ってください — 辞書はこの 4 語をいずれも動詞として認めません。実用重視の構えでは、どれか 1 つを選んで通してください。設定を指す名詞（config／settings）も 1 つに決めます（どれも正しい技術用語の名詞です。1 つ選んで通してください）。文書全体を通じて、これらの概念に他の語を使ってはいけません。
4. 下の一覧にある**決まりを当てはめます**。
5. 渡す前に**自分で点検します**。この手順は省けません。
6. **コード**、識別子、コマンド、引用されたエラーには**絶対に手を触れません**（「触れてはいけないもの」を参照）。

書くのではなく点検を頼まれたときは、違反ごとに「決まりの番号、問題のある箇所、沿った書き直し」の形で報告してください。番号を挙げてよいのは、このファイルに実在するものだけです。記憶から番号を挙げてはいけません。番号の付き方は直感に反していて、モデルは番号をでっち上げます（実際に試したところ、このファイルを持たないエージェントは「Rule 3.1: 短い文」と挙げました。本当の Rule 3.1 は動詞の形についての決まりです）。

## 2 つの構え {#two-modes}

| 構え | どんなときに | 何を当てはめるか |
|---|---|---|
| **実用重視**（既定） | ドキュメント、README、エラーメッセージ — 相手が求めているのは分かりやすい文章 | 文の組み立てに関する決まりはすべて。分野の言葉はそのまま残します（"idempotent"、"webhook"）。 |
| **厳格** | 相手が STE、ASD-STE100、準拠といった言葉を出したとき | 文の組み立ての決まりに加えて、語彙の統制も全面的に。あわせて、完全に準拠するには公式の辞書が要ることを伝えてください（asd-ste100.org で無償）。 |

## ステップ 1: 文章を分類する {#step-1-classify-the-text}

| | 手順（指示） | 説明（解説） |
|---|---|---|
| 目的 | 読み手に何をすべきかを伝える | それが何か、何をするかを説明する |
| 動詞の形 | 命令形: "Install the pump." | 単純現在／過去／未来 |
| 文の長さの上限 | **20 語**（Rule 5.1） | **25 語**（Rule 6.3） |
| まとまりの決まり | 1 文につき指示 1 つ（5.2） | 1 段落につき話題 1 つ（6.5）、1 段落は最大 6 文（6.6） |

この 2 つを 1 つの文章の中で混ぜてはいけません。「Getting started」の節は手順です。「Architecture」の節は説明です。手順の中に置く注記は説明です（25 語の上限、命令形は使いません）。

## 決まりの一覧 {#the-rule-catalog}

9 つの節に 53 の決まりがあります。ASD-STE100 Issue 9 を言い換え、ソフトウェアの例を添えたものです。公式の言い回しは asd-ste100.org にある無償の規格に載っています。

### 第 1 節 — 語（Rules 1.1-1.14） {#section-1-words-rules-11-114}

| 決まり | 指示 |
|---|---|
| 1.1 | 認められた語、技術用語の名詞、技術用語の動詞だけを使います。 |
| 1.2 | 認められた語は、載っている品詞としてだけ使います。 |
| 1.3 | 認められた語は、認められた意味でだけ使います。 |
| 1.4 | 動詞と形容詞は、認められた形だけを使います。 |
| 1.5 | 分野の言葉は技術用語の名詞として使えます（"webhook"、"commit"、"endpoint"）。 |
| 1.6 | 認められていない語は、それが技術用語の名詞か、その一部であるときだけ使います。 |
| 1.7 | 技術用語の名詞を動詞として使ってはいけません。 |
| 1.8 | 自分の製品や業界で使われている技術用語の名詞を使います。 |
| 1.9 | 技術用語の名詞を選ぶときは、短くて分かりやすいものにします。 |
| 1.10 | 地域語、俗語、内輪の言葉を技術用語の名詞にしてはいけません。 |
| 1.11 | 1 つのものに 1 つの名前を。ここでは "config"、あちらでは "settings" と呼び分けてはいけません。 |
| 1.12 | 分野の動詞は技術用語の動詞として使えます（"deploy"、"compile"、"merge"）。 |
| 1.13 | 技術用語の動詞を名詞として使ってはいけません。 |
| 1.14 | 綴りはアメリカ英語にします。 |

実用重視の構えでは、1.5・1.8・1.12 が大きな働きをします。自分の分野の語彙は使ってよい、ということです。エージェントが破りがちなのは 1.7・1.11・1.13 です。

**修正前:** You can webhook the event, then do a deploy.
**修正後:** Send the event to the webhook. Then deploy the service.

### 第 2 節 — 複数語の名詞（Rules 2.1-2.2） {#section-2-multi-word-nouns-rules-21-22}

| 決まり | 指示 |
|---|---|
| 2.1 | 複数語からなる名詞は 3 語以内で書きます。 |
| 2.2 | 技術用語の名詞に 4 語以上が要るときは、一度だけ全部を書いてから短い形を示すか、単位ごとにハイフンでつなぎます。 |

長い名詞の連なりは前置詞（of、on、in、for）で切ってください。

**修正前:** the connection pool timeout configuration value
**修正後:** the timeout value for the connection pool

### 第 3 節 — 動詞（Rules 3.1-3.7） {#section-3-verbs-rules-31-37}

| 決まり | 指示 |
|---|---|
| 3.1 | 辞書に載っている動詞の形だけを使います。 |
| 3.2 | 使えるのは、原形、命令形、単純現在、単純過去、単純未来、形容詞としての過去分詞だけです。 |
| 3.3 | 過去分詞は形容詞としてだけ使います（"the cached response"）。 |
| 3.4 | 込み入った言い回しのために助動詞を使ってはいけません。現在完了も、"is to be installed" のような形も使いません。 |
| 3.5 | "-ing" の形は、技術用語の名詞か、その一部としてだけ使います（"logging"、"the mounting bracket"）— 動詞として使ってはいけません。 |
| 3.6 | 能動態で書きます。説明の文章では、行為の主体が分からないときにだけ受動態を使えます。 |
| 3.7 | 動作は名詞ではなく動詞で表します（"perform compression of the file" ではなく "compress the file"）。 |

**使ってよい助動詞は can、will、must。使ってはいけないのは should、would、may、might、could です。**
規格は、可能性を表す場合ですら "could" を認めません。"could occur" ではなく "an explosion can occur" と書いてください。"should" については、要件なら "must" にし、推奨なら事実として言い切るか削ります。これはエージェントへの指示ではとくに重く効きます — モデルは "should" を「任意」と読むからです。

**修正前:** The migration has completed and the table is being rebuilt.
**修正後:** The migration is complete. The database rebuilds the table.

**修正前:** The flag can be set in the config file, making restarts unnecessary.
**修正後:** You can set the flag in the config file. Then a restart is not necessary.

**修正前:** The temperature must be adjusted.
**修正後:** Adjust the temperature.

### 第 4 節 — 文（Rules 4.1-4.5） {#section-4-sentences-rules-41-45}

| 決まり | 指示 |
|---|---|
| 4.1 | 短くて分かりやすい文を書きます。 |
| 4.2 | 文を短くするために語を落としたり短縮形を使ったりしてはいけません。冠詞も "that" も残します。 |
| 4.3 | 込み入った内容は箇条書きにします。 |
| 4.4 | 関連する話題の文どうしはつなぎ言葉で結びます（"Then"、"As a result"）。 |
| 4.5 | 当てはまるところでは、名詞の前に冠詞（the、a、an）か指示形容詞（this、these）を置きます。 |

Rule 4.2 は、そっけなくしすぎないための決まりです。STE は「短い文」であって「電報文」ではありません。文法は完全なままにします。

**まずい短縮:** Ensure file exists before running.
**STE:** Make sure that the file exists before you run the command.

### 第 5 節 — 手順を書く（Rules 5.1-5.5） {#section-5-procedural-writing-rules-51-55}

| 決まり | 指示 |
|---|---|
| 5.1 | 1 文は最大 20 語。警告や注意も含みます。 |
| 5.2 | 1 文につき指示は 1 つ。2 つの動作を同時に行うときだけ例外です。 |
| 5.3 | 指示は命令形で書きます: "Run the migration." |
| 5.4 | 前提となる条件はコマンドの前に置き、コンマで区切ります: "If the build fails, read the log." |
| 5.5 | 注記は情報を与えるものであり、指示ではありません。注記には 25 語の上限が当てはまります。 |

**修正前:** You'll want to grab the API key from the dashboard before configuring the client, which you can do under Settings.
**修正後:** Get the API key from the dashboard, under Settings. Then configure the client with this key.

### 第 6 節 — 説明を書く（Rules 6.1-6.6） {#section-6-descriptive-writing-rules-61-66}

| 決まり | 指示 |
|---|---|
| 6.1 | 情報は少しずつ与えます。1 文につき新しい事実は 1 つです。 |
| 6.2 | 鍵になる語や言い回しを使い、文章に筋道を持たせます。 |
| 6.3 | 1 文は最大 25 語。 |
| 6.4 | 関連する情報は段落にまとめます。 |
| 6.5 | 1 段落につき話題は 1 つ。 |
| 6.6 | 1 段落は最大 6 文。 |

説明の文章に命令形は使いません。説明は説き、手順は指示します。

### 第 7 節 — 安全に関する指示（Rules 7.1-7.3） {#section-7-safety-instructions-rules-71-73}

| 決まり | 指示 |
|---|---|
| 7.1 | 危険の度合いが分かる語を使います（"WARNING" は人が傷つくこと、"CAUTION" は物が壊れること）。 |
| 7.2 | はっきりした命令か条件から始めます。 |
| 7.3 | そのあとに危険や起こりうる結果を書きます。 |

説明のあとに指示を埋めてはいけません。この形は、破壊的な CLI のフラグ、取り消せないマイグレーション、危険な API のオプションにもそのまま当てはまります。

**修正前:** Note that data loss may occur in some circumstances if the destructive flag happens to be enabled when running against production.
**修正後:** CAUTION: Do not use the `--force` flag against production. The flag deletes rows that do not match the source.

### 第 8 節 — 句読点と語数（Rules 8.1-8.7） {#section-8-punctuation-and-word-count-rules-81-87}

| 決まり | 指示 |
|---|---|
| 8.1 | セミコロン以外の標準的な句読点はすべて使えます。セミコロンの代わりに 2 つの文を書いてください。 |
| 8.2 | ひとまとまりとして働く語どうしはハイフンでつなぎます。 |
| 8.3 | 丸かっこは、参照、項目番号、略語、複数形、補足説明、選択肢に使えます。 |
| 8.4 | 箇条書きでは、導入部の末尾のコロンが語数の上での文の終わりになります。 |
| 8.5 | 丸かっこの中身は 1 語として数えます。 |
| 8.6 | 次はそれぞれ 1 語として数えます: 数値、単位付きの数値、略語、英数字の識別子、引用された文字列、題名、ラベル、固有名詞。 |
| 8.7 | ハイフンでつないだ語は 1 語として数えます。 |

Rule 8.6 はソフトウェアの文章で効いてきます。バッククォートで囲んだ `sqlpipe run --config sqlpipe.yaml` は引用された文字列なので 1 語です。長い識別子が語数の枠を食いつぶすことはありません。

### 第 9 節 — 書き方の作法（Rules 9.1-9.4、GR-1 から GR-8） {#section-9-writing-practices-rules-91-94-gr-1-to-gr-8}

| 決まり | 指示 |
|---|---|
| 9.1 | 語を 1 つ置き換えるだけでは収まらないときは、文の組み立てごと直します。 |
| 9.2 | 認められた語は正しく使います。認められた意味で、認められた品詞として使ってください。 |
| 9.3 | 句動詞を作ってはいけません（"go down" → "decrease"、"set up" → "install" または "configure"）。 |
| 9.4 | 文書全体で、書き方と用語を一つに保ちます。 |

一般的な推奨 GR-1 から GR-8 は次のとおりです。接続詞の "that" を残す、"with" は慎重に使う、代名詞の指す先をはっきりさせる、裸の "this" より "this + 名詞" を選ぶ、空似の語を避ける、ラテン語の略語を避ける、包摂的な言葉づかいをする、そしてアポストロフィによる所有格は正しいと確信できるときだけ使う（GR-8: 迷ったら使わないでください。母語としない読み手には難しいものです）。

ソフトウェアのドキュメントでの GR-6 の当てはめ方: "e.g." は "for example"、"i.e." は "that is"、"etc." は削って項目を挙げるか "and more" と書きます。

## 語彙の統制 {#vocabulary-discipline}

公式の辞書（認められた語が約 900、代替語つきで禁じられた語が約 1,200）は ASD が著作権を持っており、ここには載せません。辞書が無くても、その仕組みは当てはめられます。**1 つの語に 1 つの意味、1 つの品詞。**

品詞についての判断で分かっているものを、型として挙げます。

| 語 | 判断 |
|---|---|
| test, check, work | 名詞のみ。"test the pump" ではなく "Do a test"。"Check that X" は "make sure that X" になります。 |
| oil | 技術用語の名詞（TN）のみ。動詞には辞書が "lubricate" を挙げています: "Lubricate the linkage with oil." |
| help | 動詞のみ。名詞には辞書が "aid" を挙げています: "with the aid of"。 |
| fall（名詞） | 認められません。値が下がることには "decrease" を使います。FALL（動詞）は、重力で物が下へ動くときだけ使います: "Make sure that the tools do not fall into the engine." |
| follow | 「あとに続く」の意味だけで、「従う」の意味では使いません。"obey the instructions" と書いてください。 |
| above, below | 物理的な位置だけに使います。限度を表すには "more than"、"less than" と書きます。 |

### 助動詞の置き換え表 {#the-modal-ladder}

| 書いてしまった語 | STE ではこう書く |
|---|---|
| should（要件） | must |
| should（推奨） | 削るか、事実として言い切る: "X is better because Y." |
| may / might / could（可能性） | can |
| may（許可） | can |
| would（仮定） | 組み立て直す: "If X occurs, Y occurs." |

### だらけた言葉を平らな言葉へ {#slop-to-simple-substitutions}

この表は ASD の辞書ではなく、この skill 独自のものです。AI が書いたドキュメントで使われすぎる語を、素直な言い換えに対応させています。その語が事実を担っていないなら、置き換えずに削ってください。

| だらけた言葉 | こう書く |
|---|---|
| leverage, utilize | use |
| in order to | to |
| prior to | before |
| ensure | make sure that（厳格な構え。実用重視の構えでは、check に当たる動詞として ensure を 1 つに選んだのなら、そのまま使ってかまいません） |
| it is worth noting that | （削る） |
| it's important to, crucially | （削って、事実だけを言う） |
| simply, just, easily, seamlessly, effortlessly | （削る） |
| robust, powerful, comprehensive, performant | （削るか、測れる性質を書く） |
| functionality | function, feature |
| enables you to, allows you to | you can |
| is designed to, aims to | （削って、何をするかを書く） |
| facilitate | help, make possible |
| dive into, delve into | read, examine |
| when it comes to | for |
| in the event that | if |
| due to the fact that | because |
| as needed, as necessary | （条件を書く） |
| and/or | どちらか 1 つを選ぶか、"X, or Y, or both" と書く |
| e.g. / i.e. / etc. | for example / that is /（項目を挙げる） |
| gracefully handles | （何をするかを書く: "retries three times, then stops"） |
| out of the box | by default |
| under the hood | internally |
| blazingly fast, state-of-the-art | fast（数値を添える）／（削る） |
| streamline | make simpler, make faster |
| plethora, myriad | many |
| addresses the issue, tackles | corrects the fault, removes the error |

### 用語をそろえる工程 {#consistency-pass}

同義語の使い分けは、それぞれ 1 語にまとめます（Rules 1.11、9.4）。下の 2 つの一覧は、性質が違います。

**技術用語の名詞 — 辞書には載っていません。1 つ選んで通してください（どちらの構えでも）:**

- config / configuration / settings / options → 1 つ選ぶ

**辞書の判断 — 規格がすでに選んでいます。厳格な構えでは認められた語を使い、実用重視の構えでは 1 つ選んで通してください:**

| 書いてしまった語 | 辞書での扱い | 代わりに使う語 |
|---|---|---|
| check (verb) / verify / confirm / ensure | いずれも動詞としては認められません | `make sure that`（厳格）／1 つ選ぶ（実用重視） |
| validate | 辞書にありません | 技術用語の動詞として使う（Rule 1.12）か、`make sure that` に置き換える |
| delete / drop (verb) / destroy | いずれも認められません | データには `erase`、物には `remove`。`drop` と `destroy` は避けます |
| remove | 認められた動詞 | そのまま使います |
| run / execute | どちらも認められません | run は `operate`、execute は `do`（厳格）／1 つ選ぶ（実用重視） |
| invoke / launch | 辞書にありません | 技術用語の動詞として使います（Rule 1.12） |
| display (verb) / render / present (verb) | いずれも認められません | `show`（認められた動詞） |
| issue | 辞書にありません | 技術用語の名詞として使うか、`problem`（認められた語）に置き換えます |
| failure | 一般的な意味では認められません。性能の低下を指す技術用語の名詞としては認められます | 性能上の不具合を指すときだけ使います: "a failure of the pump" |
| error | 認められた名詞 | そのまま使います |
| problem | 認められた名詞 | そのまま使います |

## 触れてはいけないもの {#untouchables}

次は技術上の名前です（Rules 1.5、8.6）。語彙の決まりを破っていても、そのままにしてください。

- コードブロック、行内のコード、識別子、CLI のコマンド、フラグ、ファイルのパス
- 引用されたエラーメッセージやログの行
- 製品名、API のエンドポイント名、設定のキー
- 単位付きの数値 — 文の語数の上ではそれぞれ 1 語として数えます

## ドキュメント以外への当てはめ {#beyond-documentation}

決まりは同じで、対象が変わるだけです。詳しい当てはめ方は `references/use-cases.md` にあります。

- **エラーメッセージ**: 何が起きたかを単純過去で述べ、分かっていれば原因を書き、最後に直し方を命令形で書きます。"Oops" も "Please ensure" も、謝罪の埋め草も要りません。
- **運用手順書**: STE の本領です。命令形の手順、条件を先に、警告はその手順の前に。
- **障害報告**: 単純過去だけを使います。"We have identified an issue that may have impacted" は "Between 14:02 and 14:31 UTC, 12% of requests failed." になります。
- **リリースノート**: 互換性を壊す変更は警告の形にならい、コマンドを先に、危険をあとに書きます。
- **エージェントへの指示（プロンプト、AGENTS.md）**: システムプロンプトは、質問できない読み手のための手順書です。1 文につき指示は 1 つ、"should" は使わず、条件は先に。
- **翻訳の下準備**: STE の元々の仕事です。1 つの語に 1 つの意味という決まりと完全な文法があれば、翻訳の曖昧さはほとんど消えます。

## 渡す前に自分で点検する {#self-check-before-you-deliver}

この手順は省けません。書き上げたものに、次の 4 つを当てます。

1. いちばん長い 3 つの文の語数を数えます。20／25 語を超えていたら分けてください。
2. 原稿から次を探します: `'ll`、`'re`、`'s`（短縮形）、`has been`、`have been`、`should`、コンマのあとの `-ing` 動詞、セミコロン。
3. `if` と `when` をすべて探します。どれも文の先頭、命令の前になければいけません。"Increase the timeout if the network is slow" は "If the network is slow, increase the timeout." にします。
4. 「やるべきこと」のステップ 3 で選ばなかったほうの動詞（check／verify／confirm の一組）を探します。見つかったものはすべて、選んだ動詞に置き換えてください。

見つけたところを直してから渡します。全面的な点検には `references/checklist.md` を使ってください。

## 通しの例 {#full-example}

**修正前（AI が出したままの実物）:**

> **Connection timeouts.** If sqlpipe hangs or fails with `dial tcp: i/o timeout`, check that the host running sqlpipe can reach the Postgres port (usually 5432) — this is often a security group or firewall rule blocking the connection. If you're connecting to a managed database (RDS, Cloud SQL, etc.), confirm the instance allows connections from sqlpipe's IP. You can also try increasing `source.connect_timeout_seconds` in your config, since a slow network path can trip the default timeout even when the connection eventually succeeds.

**修正後（手順と分類し、動詞は "make sure" に統一、条件を先に、1 文につき指示 1 つ）:**

> **Connection timeouts.** sqlpipe stops with `dial tcp: i/o timeout` when it cannot reach the Postgres port (5432 by default).
>
> 1. Make sure that the host that runs sqlpipe can reach the Postgres port. A firewall or security group usually blocks it.
> 2. If the database is managed (RDS, Cloud SQL), make sure that the instance accepts connections from the IP of sqlpipe.
> 3. If the network is slow, increase `source.connect_timeout_seconds` in the configuration.

変わったところ: 40 語の文を 20 語未満に分け、"you're" を元の形に戻し、"check/confirm" を "make sure that" にまとめ、条件をすべて命令の前へ移し、"etc." を削り、コードとエラーの文字列には手を触れていません。

## この skill の限界 {#limits}

STE は技術的な事実と指示のためのものです。宣伝文、ブログの語り口、ブランドの文章には当てはめないでください — 仕組み上、人を動かす力を削いでしまいます。宣伝文に STE をかけてほしいと言われたら、そのことを伝えたうえで、ドキュメントのほうに使うことを提案してください。

この skill は非公式の補助です。ASD や STEMG とは無関係で、その承認も受けていません。STE への準拠を保証できる道具は存在しません。ASD-STE100 は ASD の登録商標です。公式の規格は asd-ste100.org から無償でダウンロードできます。

## 参考資料 {#references}

- `references/checklist.md` — 検索できる型を添えた点検の全工程。点検だけを行うときと、最終確認に使います
- `references/use-cases.md` — 長めの当てはめ方: エラーメッセージ、運用手順書、障害報告、コミット、画面上の文言、多言語対応
