---
title: "人格と SOUL.md"
description: "グローバルな SOUL.md、組み込みの人格、独自のペルソナ定義で Hermes Agent の人格を自分好みにします"
upstream_path: user-guide/features/personality.md
upstream_blob: a1ca34a5356b5ea2d290c957ebe0eee9185cae60
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/personality
---

# 人格と SOUL.md {#personality-soulmd}

Hermes Agent の人格は、思いどおりに変えられます。`SOUL.md` は **エージェントの中心にある人格** で、システムプロンプトの一番先頭に置かれ、エージェントが何者かを決めます。

- `SOUL.md` — `HERMES_HOME` に置かれる、長く使うペルソナのファイル。エージェントの人格そのものになります（システムプロンプトのスロット #1）
- 組み込みまたは独自の `/personality` プリセット — セッション単位でシステムプロンプトに重ねる設定

Hermes の人となりを変えたいとき、あるいはまったく別のエージェントのペルソナに置き換えたいときは、`SOUL.md` を編集してください。

## 現在の SOUL.md のしくみ {#how-soulmd-works-now}

Hermes は、既定の `SOUL.md` を次の場所に自動で作ります。

```text
~/.hermes/SOUL.md
```

正確には、そのインスタンスの `HERMES_HOME` を使うので、カスタムのホームディレクトリで Hermes を動かしている場合は次の場所になります。

```text
$HERMES_HOME/SOUL.md
```

### 押さえておきたい振る舞い {#important-behavior}

- **SOUL.md はエージェントの中心にある人格です。** システムプロンプトのスロット #1 を占め、組み込みの既定の人格に取って代わります。
- `SOUL.md` がまだ無ければ、Hermes が出発点となるファイルを自動で作ります
- すでにある利用者の `SOUL.md` が上書きされることはありません
- Hermes は `SOUL.md` を `HERMES_HOME` からのみ読み込みます
- Hermes はカレントディレクトリの `SOUL.md` を探しません
- `SOUL.md` があっても中身が空、あるいは読み込めない場合、Hermes は組み込みの既定の人格に戻ります
- `SOUL.md` に中身があれば、セキュリティ検査と切り詰めを経たうえでそのまま差し込まれます
- SOUL.md はコンテキストファイルの節には **重複して現れません** — 人格として 1 回だけ現れます

これにより `SOUL.md` は、単に上へ重ねるだけの層ではなく、利用者ごと・インスタンスごとの本当の人格になります。

## この設計にした理由 {#why-this-design}

こうすることで、人格が予想どおりに保たれます。

もし Hermes が、起動したディレクトリの `SOUL.md` を読み込むようになっていたら、プロジェクトを移るたびに人格が思わぬ形で変わってしまいます。`HERMES_HOME` からだけ読み込むことで、人格は Hermes インスタンス自身のものになります。

説明もしやすくなります。
- 「Hermes の既定の人格を変えたいなら `~/.hermes/SOUL.md` を編集する」

## どこを編集するか {#where-to-edit-it}

ほとんどの場合は次の場所です。

```bash
~/.hermes/SOUL.md
```

カスタムのホームを使っている場合は次の場所です。

```bash
$HERMES_HOME/SOUL.md
```

## SOUL.md には何を書くか {#what-should-go-in-soulmd}

長く使う声や人格の指針を書きます。たとえば次のようなものです。
- 話し方の調子
- 伝え方
- どれくらい率直にするか
- ふだんのやり取りの姿勢
- 文体として避けたいこと
- 不確かなこと、意見の食い違い、あいまいさにどう向き合うか

次のような用途には向きません。
- その場かぎりのプロジェクトへの指示
- ファイルのパス
- リポジトリの規約
- 一時的な作業手順

これらは `SOUL.md` ではなく `AGENTS.md` に書いてください。

## よい SOUL.md の中身 {#good-soulmd-content}

よい SOUL ファイルは次のようなものです。
- 場面が変わっても変わらない
- 多くの会話に当てはまる程度に幅がある
- 声を実際に形づくる程度に具体的である
- 個別の作業への指示ではなく、伝え方と人格に集中している

### 例 {#example}

```markdown
# Personality

You are a pragmatic senior engineer with strong taste.
You optimize for truth, clarity, and usefulness over politeness theater.

## Style
- Be direct without being cold
- Prefer substance over filler
- Push back when something is a bad idea
- Admit uncertainty plainly
- Keep explanations compact unless depth is useful

## What to avoid
- Sycophancy
- Hype language
- Repeating the user's framing if it's wrong
- Overexplaining obvious things

## Technical posture
- Prefer simple systems over clever systems
- Care about operational reality, not idealized architecture
- Treat edge cases as part of the design, not cleanup
```

## Hermes がプロンプトに差し込むもの {#what-hermes-injects-into-the-prompt}

`SOUL.md` の中身は、システムプロンプトのスロット #1、つまりエージェントの人格の位置にそのまま入ります。前後に説明の文言が加わることはありません。

中身は次の処理を通ります。
- プロンプトインジェクションの検査
- 大きすぎる場合の切り詰め

ファイルが空、空白だけ、あるいは読み取れない場合、Hermes は組み込みの既定の人格（「You are Hermes Agent, an intelligent AI assistant created by Nous Research...」）に戻ります。この動きは `skip_context_files` が設定されているとき（サブエージェントや委任の場面など）にも当てはまります。

## セキュリティ検査 {#security-scanning}

`SOUL.md` も、ほかのコンテキストを持つファイルと同じように、取り込まれる前にプロンプトインジェクションのパターンがないか検査されます。

ですから、妙なメタ指示を紛れ込ませようとするのではなく、あくまでペルソナと声に集中した内容にしておいてください。

## SOUL.md と AGENTS.md の違い {#soulmd-vs-agentsmd}

これがいちばん大事な区別です。

### SOUL.md {#soulmd}
次のことに使います。
- 人格
- 話し方の調子
- 文体
- ふだんの伝え方
- 人格のレベルでの振る舞い

### AGENTS.md {#agentsmd}
次のことに使います。
- プロジェクトのアーキテクチャ
- コーディング規約
- 好みのツール
- リポジトリ固有の作業手順
- コマンド、ポート、パス、デプロイの注意点

わかりやすい目安は次のとおりです。
- どこへ行っても付いてきてほしいものは `SOUL.md`
- プロジェクトに属するものは `AGENTS.md`

## SOUL.md と `/personality` の違い {#soulmd-vs-personality}

`SOUL.md` は、長く使う既定の人格です。

`/personality` は、いまのシステムプロンプトを変えたり補ったりする、セッション単位の重ね書きです。

まとめると次のようになります。
- `SOUL.md` = 土台となる声
- `/personality` = 一時的なモードの切り替え

例:
- ふだんは実務的な SOUL のまま、指導する会話のときだけ `/personality teacher` を使う
- 簡潔な SOUL のまま、発想を広げたいときだけ `/personality creative` を使う

## 組み込みの人格 {#built-in-personalities}

Hermes には、`/personality` で切り替えられる人格があらかじめ用意されています。

| 名前 | 説明 |
|------|-------------|
| **helpful** | 親しみやすい万能アシスタント |
| **concise** | 短く要点だけを返す |
| **technical** | 詳しく正確な技術の専門家 |
| **creative** | 型にとらわれない発想 |
| **teacher** | わかりやすい例で辛抱強く教える |
| **kawaii** | かわいい言い回しときらめきと元気 ★ |
| **catgirl** | 猫っぽい話し方のねこちゃん、にゃ〜 |
| **pirate** | 技術に強い海賊、キャプテン Hermes |
| **shakespeare** | 芝居がかった吟遊詩人ふうの文体 |
| **surfer** | どこまでもゆるいサーファー気分 |
| **noir** | ハードボイルドな探偵の語り |
| **uwu** | uwu 言葉でかわいさ全開 |
| **philosopher** | どんな問いにも深く思索する |
| **hype** | エネルギーと熱狂を最大に!!! |

## コマンドで人格を切り替える {#switching-personalities-with-commands}

### CLI {#cli}

```text
/personality
/personality concise
/personality technical
```

### メッセージングのプラットフォーム {#messaging-platforms}

```text
/personality teacher
```

これらは手軽に重ねられる設定ですが、重ねた内容が大きく変えないかぎり、Hermes のふだんの人格はグローバルな `SOUL.md` が決めたままです。

## 設定ファイルで人格を作る {#custom-personalities-in-config}

組み込みの人格は、どの画面（CLI、メッセージングのプラットフォーム、TUI、デスクトップアプリ）でも常に使えます。自分で作った人格を加えることも、同じ名前を使って組み込みのものを上書きすることもできます。書き場所は `~/.hermes/config.yaml` の `agent.personalities` です。

```yaml
agent:
  personalities:
    codereviewer: >
      You are a meticulous code reviewer. Identify bugs, security issues,
      performance concerns, and unclear design choices. Be precise and constructive.
```

そのうえで、次のように切り替えます。

```text
/personality codereviewer
```

選んだ内容は名前として `display.personality` に保存されます。人格が `agent.system_prompt` に触れることはありません。こちらは自分で書くシステムプロンプト専用の項目で、人格を何も選んでいないときにだけ効きます。

## 既定の状態に戻す {#resetting-to-the-default}

いま重ねている人格を取り消して、もとの振る舞い（`SOUL.md` のペルソナと、設定していれば `agent.system_prompt`）に戻すには、次のいずれかを使います。

```text
/personality none
/personality default
/personality neutral
```

3 つとも選択（`display.personality`）を消し、次のメッセージから反映されます。引数なしで `/personality` を実行すると、使えるプリセットと並んで `none` も一覧に出て、いま有効なものに印が付きます。

:::note アップグレード時の一度きりのリセット
以前のバージョンの Hermes は、画面ごとに人格の状態をばらばらに保存していたため、いったん切ったはずの人格がまた有効になることがありました。アップグレード後の最初の起動で、保存されていた人格の選択は一度だけ `none` に戻されます（移行処理が、どの人格を解除したかを表示します）。まだ使いたい場合は `/personality <name>` で有効にし直してください。自分で書いた `agent.system_prompt` の文章には手が加わりません。
:::

## おすすめの進め方 {#recommended-workflow}

しっかりした初期設定は次のとおりです。

1. よく考えたグローバルな `SOUL.md` を `~/.hermes/SOUL.md` に置く
2. プロジェクトへの指示は `AGENTS.md` に書く
3. `/personality` は、一時的にモードを変えたいときだけ使う

こうすると、次の状態になります。
- 声が安定する
- プロジェクト固有の振る舞いが、あるべき場所に収まる
- 必要なときだけ一時的に切り替えられる

## 人格とプロンプト全体の関係 {#how-personality-interacts-with-the-full-prompt}

大まかに言うと、プロンプトは次の順で積み上がっています。
1. **SOUL.md**（エージェントの人格。SOUL.md が使えない場合は組み込みの既定）
2. ツールを踏まえた振る舞いの指針
3. メモリと利用者のコンテキスト
4. スキルの指針
5. コンテキストファイル（`AGENTS.md`、`.cursorrules`）
6. タイムスタンプ
7. プラットフォームごとの書式のヒント
8. `/personality` などの、必要に応じたシステムプロンプトの重ね書き

`SOUL.md` が土台であり、それ以外はすべてその上に積み上がります。

## 関連ページ {#related-docs}

- [コンテキストファイル](/hermes/docs/user-guide/features/context-files/)
- [設定](/hermes/docs/user-guide/configuration/)
- [こつとおすすめのやり方](/hermes/docs/guides/tips/)
- [SOUL.md ガイド](/hermes/docs/guides/use-soul-with-hermes/)

## CLI の見た目と会話の人格 {#cli-appearance-vs-conversational-personality}

会話の人格と CLI の見た目は別のものです。

- `SOUL.md`、`agent.system_prompt`、`/personality` は Hermes の話し方に影響します
- `display.skin` と `/skin` は、ターミナルでの Hermes の見た目に影響します

ターミナルの見た目については、[スキンとテーマ](/hermes/docs/user-guide/features/skins/)をご覧ください。
