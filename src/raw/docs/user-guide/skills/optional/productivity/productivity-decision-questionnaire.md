---
title: "Decision Questionnaire — 自分では答えの出せない決めごとを質問票にする"
description: "自分では答えの出せない決めごとを質問票にする"
upstream_path: user-guide/skills/optional/productivity/productivity-decision-questionnaire.md
upstream_blob: 73669a692052e81426bbe50ac1ab69737fa4e3d4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-decision-questionnaire
---

# Decision Questionnaire {#decision-questionnaire}

自分では答えの出せない決めごとを質問票にします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/productivity/decision-questionnaire` で導入します |
| パス | `optional-skills/productivity\decision-questionnaire` |
| バージョン | `1.0.0` |
| 作者 | Matt Pocock (mattpocock/skills, to-questionnaire) + Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `questionnaire`, `decision`, `async`, `stakeholder`, `discovery`, `communication` |
| 関連 skill | [`meeting-action-items`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-meeting-action-items/), [`document-to-action-items`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-document-to-action-items/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Decision Questionnaire {#decision-questionnaire}

利用者ひとりでは答えられないことを、**質問票**に変えます。相手にひとりで非同期に
記入してもらうか、打ち合わせの場で一緒に埋めていくための Markdown 文書です。相手は
利用者が持っていない知識を持っています。質問票は、それを引き出すための道具です。

mattpocock/skills の MIT ライセンスの `to-questionnaire` skill を移植したものです。

## こんなときに使います {#when-to-use}

- 判断が、他の誰か（その分野の専門家、関係者、取引先の担当、運用チーム）の持つ事実や
  判断待ちで止まっているとき
- 利用者が「これは X に聞かないと」と言っている、あるいは誰かの返答待ちで判断を先送りし
  続けているとき
- 具体的な答えを持ち帰る必要のある打ち合わせに備えるとき

答えが手元の環境（コードベース、ドキュメント、Web）から分かる場合には使わないでください。
まず自分で調べます。

## 基本の考え方: 相手ではなく送り方について聞く {#core-principle-interview-the-send-not-the-subject}

利用者は中身についての質問に答えられません。だからこそ質問票を作るのです。一方で、
送り方についての質問にはいつでも答えられます。聞くのはそこだけにして、短いやりとりを
2回だけ行います。

1. **誰に送るのか。** 役割、専門、利用者との関係です。ここで質問票の口調と、どれだけ
   前提を書き添えるべきかが決まります。相手が誰で、利用者の知らない何を知っているのかが
   分かれば完了です。
2. **何を持ち帰りたいのか。** 利用者ひとりでは決められない具体的な判断や事実です。
   これを終えたときに利用者が何をできる・決められる状態になっていればよいのか、
   その一覧がそろえば完了です。

そのうえで**質問票を書きます**。相手が知っていることと利用者に必要なことの差を狙った
質問を、下の構成に従って書き起こします。作業中のディレクトリに
`decision-questionnaire-<slug>.md` として書き出し（slug は話題から取ります）、絶対パスを
報告してください。ファイルができていて、手順2で挙げた項目がすべてどれかの質問で
カバーされていれば完了です。

## 文書の構成 {#document-structure}

**聞き取りのための質問票**として組み立てます。前提を欠いているのは利用者のほうで、
それを持っているのが相手です。質問は大事なものから順に並べます（非同期では一往復しか
できないこともあります）。数が増えてきたら、テーマごとに `##` の見出しでまとめます。

ひな形です。

```markdown
# <Questionnaire title>

**Purpose:** why this questionnaire exists and the decision riding on it.

**From:** <the user> · **To:** <the recipient> ·
**How your answers will be used:** <where they go>

## Context

One paragraph orienting a recipient who wasn't in the user's head. Enough
to answer well, not a page.

## How to answer

Deadline and rough effort. Partial answers and "I don't know" are useful:
flag anything you're unsure of rather than skipping it.

## <Theme heading>

### <One question — a single idea, never compound>

_Why this matters: <one line, only where the question could be misread or
invite a throwaway answer>._

>

## Anything else?

A closing catch-all: anything we didn't ask that we should know?
```

質問には必ず、そのすぐ下に答えを書き込む欄（`>`）を付けます。

## つまずきやすいところ {#pitfalls}

1. **中身について利用者を問い詰めてしまう。** 答えられないからこの文書を作るのです。
   聞くのは送り方についてだけにします。
2. **複数の論点を1つの質問に混ぜてしまう。** 質問1つにつき論点は1つです。「〜と〜」
   「〜または〜」でつながった質問は分けてください。
3. **いちばん重要な質問を埋もれさせてしまう。** 大事なものから先に。非同期の相手は
   途中で息切れします。
4. **前提を書きすぎてしまう。** 経緯の全部ではなく、状況が分かる1段落にします。
5. **意味の取りづらい質問に「なぜ聞くのか」の一行を付け忘れる。** その一行が、
   投げやりな答えを役に立つ答えに変えます。ただし、もともと誤解の余地がない質問には
   付けないでください。

## 確認 {#verification}

- [ ] 書き始める前に、2回のやりとりで相手の役割・知識と必要な成果をつかんだ
- [ ] 手順2の項目が、それぞれ少なくとも1つの質問でカバーされている
- [ ] 質問は論点1つずつ、大事なものから順、答えを書き込む欄がある
- [ ] ファイルを書き出し、絶対パスを利用者に伝えた
