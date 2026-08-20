---
title: "どのファイルが何をするのか"
description: "SOUL.md と USER.md と MEMORY.md と AGENTS.md の違い。エージェントが持つファイルを1ページにまとめ、誰が書き、いつエージェントの目に入るのかを示します"
upstream_path: user-guide/which-file-does-what.md
upstream_blob: 153e2648db594190a59ff5f94d08b14c151a5ce1
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what
---

# どのファイルが何をするのか {#which-file-does-what}

「エージェントに伝えたのに忘れられた」「エージェントの頭脳はどのファイル？」「SOUL.md を書き換えたのに、名前を覚えてくれないのはなぜ？」——こうした疑問はどれも同じところに行き着きます。Hermes Agent はいくつかのマークダウンファイルによって形づくられていて、それぞれ役割が違うのです。このページでは、それらを一箇所にまとめて見取り図にします。個々の詳しい話は [永続メモリ](/hermes/docs/user-guide/features/memory/)、[パーソナリティと SOUL.md](/hermes/docs/user-guide/features/personality/)、[コンテキストファイル](/hermes/docs/user-guide/features/context-files/) をたどってください。

## 全体の対応表 {#the-master-table}

| ファイル | 何が入るか | 誰が書くか | いつエージェントの目に入るか | どこに置かれるか |
|------|---------------|---------------|------------------------|----------------|
| **SOUL.md** | エージェントの中心的な人格——性格、口調、話し方、文体として避けたいこと | あなた。ファイルが無ければ Hermes が出発点となる雛形を自動で用意します。既にあるファイルが上書きされることはありません | セッション開始時、システムプロンプトの1枠目 | `~/.hermes/SOUL.md`（ホームを変えている場合は `$HERMES_HOME/SOUL.md`）。作業ディレクトリには置かれません |
| **USER.md** | 利用者のプロフィール——名前、役割、好み、話し方、期待していること | エージェントが `memory` ツールで書きます（保存に `write_approval` の確認を挟むことも、`hermes journey edit` で項目を直すこともできます） | セッション開始時に固定されたスナップショットとしてシステムプロンプトへ差し込まれます | `~/.hermes/memories/` |
| **MEMORY.md** | エージェント自身の覚え書き——環境まわりの事実、プロジェクトの決まりごと、ツールの癖、学んだこと | エージェントが `memory` ツールで書きます（確認や編集の方法は USER.md と同じ） | セッション開始時に固定されたスナップショットとしてシステムプロンプトへ差し込まれます | `~/.hermes/memories/` |
| **AGENTS.md** | プロジェクトの指示・決まりごと・構成——コマンド、ポート、パス、そのリポジトリ固有の進め方 | あなた（またはそのプロジェクトを書いた人） | 起動時に作業ディレクトリから読み込まれてシステムプロンプトに入ります。下位ディレクトリに置かれたものは、エージェントがそこへ移動するにつれて順次見つかります | プロジェクトの作業ディレクトリとその下位ディレクトリ |
| **.hermes.md** / **HERMES.md** | プロジェクトの指示。AGENTS.md と同じ役割ですが Hermes 専用で、優先度が最も高いもの | あなた | 起動時にシステムプロンプトへ読み込まれます（最初に見つかったものが AGENTS.md より優先されます） | 自分のプロジェクト。探索は git のルートまでさかのぼります |

:::info プロジェクトのコンテキストファイルは1セッションに1つ
1セッションで読み込まれるプロジェクトのコンテキストは**1種類**だけで、最初に見つかったものが採用されます。順番は `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` です。`SOUL.md` はエージェントの人格として常に独立して読み込まれ、この優先順位の連なりには含まれません。`CLAUDE.md` や `.cursorrules` との互換性を含む全一覧は [コンテキストファイル](/hermes/docs/user-guide/features/context-files/) を参照してください。
:::

覚えやすい言い方をすると、こうなります。

- **SOUL.md** はエージェントが*何者か*。どこへ行っても付いてきてほしいことは、ここに書きます。
- **USER.md** は*あなた*が何者か。エージェントがあなたのために書き足していきます。
- **MEMORY.md** はエージェントが*学んだこと*。これもエージェント自身が育てます。
- **AGENTS.md**（または `.hermes.md`）は*プロジェクト*が必要とすること。プロジェクトに属する内容は、ここに書きます。

## 「さっき言ったことを、なぜ忘れるのか」 {#why-did-it-forget-what-i-just-said}

メモリ（MEMORY.md と USER.md）は、セッション開始時に一度だけ切り取られた**固定のスナップショット**としてシステムプロンプトへ差し込まれます。セッションの途中でエージェントが何かを保存すると、その変更はすぐディスクへ書かれますが、システムプロンプトに現れるのは次のセッションからです。これは意図した設計で、LLM の接頭辞キャッシュを保って性能を上げるためです。ツールの応答は常に最新の状態を返すので、失われるものはありません。新しいセッションを始めれば、更新されたメモリがそこにあります。詳しくは [メモリがシステムプロンプトに現れるしくみ](/hermes/docs/user-guide/features/memory/#how-memory-appears-in-the-system-prompt) を参照してください。

## よくある取り違え {#common-mix-ups}

### 「自分に関する事実を SOUL.md に書いたのに、USER.md が空のままだった」 {#i-put-facts-about-myself-in-soulmd-but-usermd-stayed-empty}

`SOUL.md` と `USER.md` は別々の仕組みで、互いに中身を渡し合うことはありません。`SOUL.md` は**あなた**が直接書き換える人格のファイルで、口調と人格を形づくり、その内容はプロンプトの1枠目にそのまま差し込まれます。`USER.md` は永続メモリの一部で、**エージェント**が `memory` ツールを通じて書きます。自分に関する事実を USER.md に入れたいなら、エージェントに伝えてください（「簡潔な回答が好みだと覚えておいて」など）。そうすれば保存されます。SOUL.md を書き換えてもメモリは埋まりませんし、メモリの項目が人格を変えることもありません。SOUL.md は長く保ちたい声色や人格の指針に使い、好みやプロフィールの事実はメモリに任せましょう。[SOUL.md には何を書くべきか](/hermes/docs/user-guide/features/personality/#what-should-go-in-soulmd) と [2つの保存先](/hermes/docs/user-guide/features/memory/#two-targets-explained) も参照してください。

### 「セッションの途中で名前を伝えたのに、聞いていないかのように振る舞う」 {#i-told-it-my-name-mid-session-and-it-acted-like-it-never-heard-it}

エージェントが名前をメモリに保存したのなら、その保存自体は成功しています。`memory` ツールの応答か `hermes journey list` で確かめられます。起きているのは、先ほどの固定スナップショットの話です。システムプロンプトはセッションの途中で更新されないため、*差し込まれた*メモリの塊はセッション開始時のままなのです。伝えた内容は会話の中に残っているので、そのセッション中もエージェントは使えますし、保存された項目は次のセッションからシステムプロンプトに入ります。同じことは、セッションが動いている最中に `SOUL.md` や `AGENTS.md` を書き換えた場合にも当てはまります。文脈はセッション開始時に組み立てられるので、変更を反映させたいならセッションを開き直してください。

:::tip 迷ったときの早見表
- エージェントの**話し方**を変えたい → `~/.hermes/SOUL.md` を編集します。[パーソナリティと SOUL.md](/hermes/docs/user-guide/features/personality/)。
- ある事実を**覚えていてほしい** → 伝えるだけです。エージェントが自分でメモリに保存します。[永続メモリ](/hermes/docs/user-guide/features/memory/)。
- **プロジェクトの決まりごと**を定めたい → プロジェクトに `AGENTS.md`（または `.hermes.md`）を置きます。[コンテキストファイル](/hermes/docs/user-guide/features/context-files/)。
- **一時的に**人格を変えたい → `/personality` を使います。セッション単位の上乗せなので、ファイルを触る必要はありません。
:::

## 関連ドキュメント {#related-docs}

- [永続メモリ](/hermes/docs/user-guide/features/memory/) — MEMORY.md、USER.md、`memory` ツール、容量の上限、`write_approval`
- [パーソナリティと SOUL.md](/hermes/docs/user-guide/features/personality/) — SOUL.md に書く内容の指針、`/personality` のプリセット、プロンプトの積み重なり
- [コンテキストファイル](/hermes/docs/user-guide/features/context-files/) — AGENTS.md、`.hermes.md`、段階的な探索、セキュリティ走査
