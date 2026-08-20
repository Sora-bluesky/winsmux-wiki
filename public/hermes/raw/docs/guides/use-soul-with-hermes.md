---
title: "Hermes で SOUL.md を使う"
description: "SOUL.md で Hermes Agent の既定の話し方を形づくる方法と、そこに何を書くべきか、AGENTS.md や /personality との違い"
upstream_path: guides/use-soul-with-hermes.md
upstream_blob: 81a3680b0d6f0c6d531824646c80f610723f5889
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/use-soul-with-hermes
---

# Hermes で SOUL.md を使う {#use-soulmd-with-hermes}

`SOUL.md` は、その Hermes に与える**中心となる人格**です。システムプロンプトのいちばん先頭に置かれ、エージェントが何者で、どう話し、何を避けるのかを決めます。

話しかけるたびに同じ相手だと感じられるようにしたい場合や、Hermes の人格をまるごと自分好みのものに置き換えたい場合は、このファイルを使います。

## SOUL.md に書くこと {#what-soulmd-is-for}

`SOUL.md` は次のために使います。
- 口調
- 人格
- 話し方
- Hermes をどれくらい率直に、あるいは温かくするか
- 文体として Hermes に避けてほしいこと
- 不確かさ・意見の相違・曖昧さに Hermes がどう向き合うか

ひとことで言えば、
- `SOUL.md` は Hermes が何者で、どう話すかを決めるものです

## SOUL.md に書かないこと {#what-soulmd-is-not-for}

次のような用途には使わないでください。
- リポジトリ固有のコーディング規約
- ファイルのパス
- コマンド
- サービスのポート番号
- アーキテクチャに関するメモ
- プロジェクトの進め方の指示

これらは `AGENTS.md` に書くものです。

目安はこうです。
- どこでも当てはまる内容なら `SOUL.md` に置く
- 特定のプロジェクトにしか当てはまらない内容なら `AGENTS.md` に置く

## 置き場所 {#where-it-lives}

Hermes は現在、そのインスタンスのグローバルな SOUL ファイルだけを使います。

```text
~/.hermes/SOUL.md
```

ホームディレクトリを変えて Hermes を動かしている場合は、次の場所になります。

```text
$HERMES_HOME/SOUL.md
```

## 初回起動時の動き {#first-run-behavior}

`SOUL.md` がまだ無ければ、Hermes が出発点となるファイルを自動で用意します。

そのため、ほとんどの人は最初から、読んですぐ編集できる実物のファイルを手にすることになります。

注意すべき点は次のとおりです。
- すでに `SOUL.md` がある場合、Hermes がそれを上書きすることはありません
- ファイルはあるが中身が空の場合、そこからプロンプトに加わるものは何もありません

## Hermes はこれをどう使うか {#how-hermes-uses-it}

セッションを開始すると、Hermes は `HERMES_HOME` から `SOUL.md` を読み込み、プロンプトインジェクションのパターンが無いか調べ、必要なら切り詰めたうえで、**エージェントの人格**（システムプロンプトの 1 番目の枠）として使います。つまり SOUL.md は、組み込みの既定の人格の文面をそっくり置き換えます。

SOUL.md が無い、空である、あるいは読み込めない場合、Hermes は組み込みの既定の人格に戻ります。

ファイルの周りに説明的な文言が足されることはありません。中身そのものがすべてです。エージェントにこう考えてこう話してほしい、という形で書いてください。

## 最初の一手 {#a-good-first-edit}

ほかに何もしないとしても、ファイルを開いて数行だけ自分らしく書き換えてみてください。

たとえば次のように書きます。

```markdown
You are direct, calm, and technically precise.
Prefer substance over politeness theater.
Push back clearly when an idea is weak.
Keep answers compact unless deeper detail is useful.
```

これだけでも、Hermes の印象ははっきり変わります。

## 文体の例 {#example-styles}

### 1. 現実的なエンジニア {#1-pragmatic-engineer}

```markdown
You are a pragmatic senior engineer.
You care more about correctness and operational reality than sounding impressive.

## Style
- Be direct
- Be concise unless complexity requires depth
- Say when something is a bad idea
- Prefer practical tradeoffs over idealized abstractions

## Avoid
- Sycophancy
- Hype language
- Overexplaining obvious things
```

### 2. 研究のパートナー {#2-research-partner}

```markdown
You are a thoughtful research collaborator.
You are curious, honest about uncertainty, and excited by unusual ideas.

## Style
- Explore possibilities without pretending certainty
- Distinguish speculation from evidence
- Ask clarifying questions when the idea space is underspecified
- Prefer conceptual depth over shallow completeness
```

### 3. 教える人・説明する人 {#3-teacher-explainer}

```markdown
You are a patient technical teacher.
You care about understanding, not performance.

## Style
- Explain clearly
- Use examples when they help
- Do not assume prior knowledge unless the user signals it
- Build from intuition to details
```

### 4. 厳しいレビュアー {#4-tough-reviewer}

```markdown
You are a rigorous reviewer.
You are fair, but you do not soften important criticism.

## Style
- Point out weak assumptions directly
- Prioritize correctness over harmony
- Be explicit about risks and tradeoffs
- Prefer blunt clarity to vague diplomacy
```

## よい SOUL.md とは {#what-makes-a-strong-soulmd}

よい `SOUL.md` は次のようなものです。
- 安定している
- 幅広く当てはまる
- 声の特徴がはっきりしている
- 一時的な指示を詰め込みすぎていない

よくない `SOUL.md` は次のようなものです。
- プロジェクトの詳細だらけ
- 内容が矛盾している
- 応答の形を一つひとつ細かく指図しようとしている
- 「助けになること」「明確であること」のような、当たり障りのない文言ばかり

Hermes はもともと、助けになるように、明確であるように振る舞います。`SOUL.md` には、当たり前の既定を言い直すのではなく、本当の意味での人格や文体を足してください。

## 構成の案 {#suggested-structure}

見出しは必須ではありませんが、あると整理しやすくなります。

うまく機能する単純な構成は次のとおりです。

```markdown
# Identity
Who Hermes is.

# Style
How Hermes should sound.

# Avoid
What Hermes should not do.

# Defaults
How Hermes should behave when ambiguity appears.
```

## SOUL.md と /personality {#soulmd-vs-personality}

この 2 つは補い合う関係です。

普段の土台となる人格には `SOUL.md` を使います。
一時的にモードを切り替えたいときは `/personality` を使います。

たとえば次のような形です。
- 既定の SOUL は現実的で率直な人格にしておく
- あるセッションだけ `/personality teacher` を使う
- あとで元に戻す。土台となる声のファイルには手を触れない

## SOUL.md と AGENTS.md {#soulmd-vs-agentsmd}

いちばんよくある取り違えがここです。

### SOUL.md に書くもの {#put-this-in-soulmd}
- 「率直に述べること。」
- 「大げさな言い回しを避けること。」
- 「深く掘り下げる必要がなければ短く答えること。」
- 「利用者が間違っているときは指摘すること。」

### AGENTS.md に書くもの {#put-this-in-agentsmd}
- 「unittest ではなく pytest を使うこと。」
- 「フロントエンドは `frontend/` にある。」
- 「マイグレーションを直接編集しないこと。」
- 「API はポート 8000 で動いている。」

## 編集の仕方 {#how-to-edit-it}

```bash
nano ~/.hermes/SOUL.md
```

または

```bash
vim ~/.hermes/SOUL.md
```

編集したら Hermes を再起動するか、新しいセッションを開始します。

## 実際の進め方 {#a-practical-workflow}

1. 自動で用意された既定のファイルから始める
2. 求めている声と合わない部分を削る
3. 口調と既定の振る舞いをはっきり決める行を 4〜8 行足す
4. しばらく Hermes と話してみる
5. しっくり来ないところを調整する

一発で完璧な人格を設計しようとするより、この繰り返しのほうがうまくいきます。

## トラブルシューティング {#troubleshooting}

### SOUL.md を編集したのに Hermes の話し方が変わらない {#i-edited-soulmd-but-hermes-still-sounds-the-same}

次を確認してください。
- 編集したのが `~/.hermes/SOUL.md` または `$HERMES_HOME/SOUL.md` であること
- リポジトリの中にある別の `SOUL.md` を触っていないこと
- ファイルが空でないこと
- 編集後にセッションを開始し直したこと
- `/personality` の重ね掛けが結果を支配していないこと

### SOUL.md の一部が無視されている {#hermes-is-ignoring-parts-of-my-soulmd}

考えられる原因は次のとおりです。
- 優先度の高い指示に上書きされている
- ファイルの中で指示どうしが食い違っている
- ファイルが長すぎて切り詰められた
- 一部の文がプロンプトインジェクションの内容に似ており、検査によって遮断・変更された

### SOUL.md がプロジェクト寄りになりすぎた {#my-soulmd-became-too-project-specific}

プロジェクト向けの指示は `AGENTS.md` に移し、`SOUL.md` は人格と文体に絞ってください。

## 関連ドキュメント {#related-docs}

- [人格と SOUL.md](/hermes/docs/user-guide/features/personality/)
- [コンテキストファイル](/hermes/docs/user-guide/features/context-files/)
- [設定](/hermes/docs/user-guide/configuration/)
- [コツと定石](/hermes/docs/guides/tips/)
