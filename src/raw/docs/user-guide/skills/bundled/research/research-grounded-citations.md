---
title: "Grounded Citations — 回答や文書を、たどれる出典に結び付ける"
description: "回答や文書を、たどれる出典に結び付ける"
upstream_path: user-guide/skills/bundled/research/research-grounded-citations.md
upstream_blob: 938e223a68a7c876b4f8a0870f360879a297761e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-grounded-citations
---

# Grounded Citations {#grounded-citations}

回答や文書を、たどれる出典に結び付けます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/research\grounded-citations` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent + Teknium |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Research`, `Citations`, `Grounding`, `Sources`, `Web`, `Reports` |
| 関連 skill | [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/), [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/), `ocr-and-documents` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Grounded Citations {#grounded-citations}

外部の情報源から取ったことは、すべて本文中に番号付きの出典を添え、末尾に
`Sources:` の一覧を付けます。Perplexity のような形です。`url → [n]` の対応は台帳スクリプトが
持っているので、番号も URL も取得結果から決まり、記憶から出てくることはありません。
モデルは、渡された小さな整数を書き写すだけです。

失敗の許されない作業では、同じ台帳が事実確認の連なりにもなります。原文どおりの
引用文を情報源ごとに結び付け（取得したページ本文にそのまま現れないかぎり受け付けません）、
モデルの知識から書いたことには `[unverified]` の印を付け、`verify --evidence` は
引用した情報源に根拠が付いていない原稿をはじきます。

この skill は、チャットでの回答、書き上げる文書（markdown、PDF、docx、スライド）、
調査報告のすべてを対象にします。学術用の BibTeX の流れは対象外です。学会論文には
`arxiv` の skill を使ってください。この skill はそちらへ橋渡しをします
（`references/citation-formats.md` を参照）。

## こんなときに使います {#when-to-use}

もともと知っていたことではなく、取ってきた情報に答えや成果物が乗っているときは、
いつでも使ってください。

- 調査、比較、ニュースのまとめ、「X の今はどうなっているか」
- 外部の事実を引用・言い換え・報告するかたちでディスクに書き出す成果物すべて。
  報告書、要約、文書、スライド、ナレッジベースのページなど
- 利用者が裏を取りたくなるような事実調べ
- 食い違う情報源をどちらの出どころか示す必要がある、複数の情報の突き合わせ

別の作業のついでに取得しただけのとき——コーディング中に書き方やバージョンをさっと調べた、
雑談、創作——は、本文中の出典を省いてかまいません。利用者がリンクを欲しがりそうなときだけ
URL に触れます。

## 事前に必要なもの {#prerequisites}

標準の道具立て以外に必要なものはありません。`scripts/sources.py` は標準ライブラリだけの
Python 3 です。取得には、設定してあるもの——`web_search`、`web_extract`、
`browser_navigate`、`terminal`（curl や各種 CLI）——を何でも使えます。

台帳の置き場所: `$HERMES_HOME/cache/citations/ledger.json`（プロファイルごとに分かれます）。
作業ごとに変えたいときは `--ledger <path>` か `HERMES_CITATION_LEDGER` で指定します。

## 実行のしかた {#how-to-run}

```bash
S=~/.hermes/skills/research/grounded-citations/scripts/sources.py

python "$S" reset                                  # start a clean ledger
python "$S" add https://example.com/a --title "A"  # prints: [1]
python "$S" add https://example.com/b --title "B"  # prints: [2]
python "$S" list                                   # ledger table
python "$S" render                                 # Sources: block
python "$S" verify draft.md                        # catch bad citations
```

`add` は何度実行しても同じ結果になり、URL は正規化されます。同じページなら 1 つの台帳の中で
必ず同じ番号が返るので、検索と抽出を何度繰り返しても番号がぶれません。

## 早見表 {#quick-reference}

| やりたいこと | コマンド |
|---|---|
| 新しい作業のために台帳をまっさらにする | `sources.py reset` |
| 情報源を登録して番号をもらう | `sources.py add <url> [--title T]` |
| まとめて登録する | `sources.py add <url1> <url2> ...` |
| ツールの JSON 出力から登録する | `sources.py ingest results.json` |
| 情報源に原文どおりの根拠を結び付ける | `sources.py quote <id> --text "exact wording" --from page.txt` |
| 台帳を表示する | `sources.py list [--json]` |
| Sources のかたまりを組み立てる | `sources.py render [--style markdown\|plain\|footnotes\|bibtex\|evidence] [--only 1,3]` |
| 原稿が引用しているものだけを組み立てる | `sources.py render --cited-in draft.md` |
| 原稿の Sources を書き換える | `sources.py render --replace-in draft.md` |
| 原稿の出典を点検する | `sources.py verify draft.md [--strict] [--min-coverage 0.6] [--evidence]` |

## 手順 {#procedure}

① 出典付きの回答や文書を作る作業の最初に、**台帳をまっさらにします**。すでに原稿に番号が
書かれている作業の続きなら、まっさらにしないでください。台帳を使い回すほうが番号が保たれます。

② **取得したその場で、情報源をすべて登録します。** `web_search` / `web_extract` /
`browser_navigate` / 取得のたびに、URL を `sources.py add` に渡します（生の JSON を
`sources.py ingest` に流し込んでもかまいません）。文章を書く*前*にやってください。
あとから記憶を頼りに登録するのが、この skill が防ごうとしている失敗そのものです。

③ **書きながら出典を付けます。** 情報源が支えている文のすぐ後ろに、角かっこの番号を置きます。

```
Ice floats because it is less dense than liquid water.[1][2]
```

- かっこの前に空白を入れません。番号は 1 つずつ別のかっこに入れます。
- 1 つの文につき番号は最大 3 つまで。最後にまとめて置くのではなく、文ごとに付けます。
- 台帳が返した番号だけを使います。番号も URL も、決して自分で作らないでください。
- 自分の知識から書いたことには出典を付けません。
- 情報源が食い違うときは、両方の読み方をそれぞれの番号とともに示します。
- 数値、日付、名前は情報源の書きかたどおりに引き、足りないところは
  ならして隠さず「X の出典は見つからなかった」とはっきり書きます。

④ `sources.py render --cited-in <draft>` で **Sources のかたまりを末尾に付けます**。
番号と URL の対応が、打ち直しではなく台帳から機械的に作られるようにするためです。
markdown 以外に書き出すときは合う `--style` を選び、置き場所は
`references/citation-formats.md` に従ってください（docx なら脚注、PDF や LaTeX なら
文末注、スライドなら Sources のページ、ナレッジベース形式ならページごとの出典一覧です）。

⑤ **渡す前に点検します。** `sources.py verify <draft>` は、知らない番号があるとき、
Sources のかたまりが台帳と食い違うとき、（`--min-coverage` を付けた場合は）本文の出典が
薄すぎるときに、0 以外で終了します。直して実行し直してください。

⑥ **チャットでの回答**も同じ手順で、返信そのものを原稿として扱います。情報源を登録し、
本文中に出典を付け、最後に組み立てた `Sources:` の一覧で締めます。短い回答なら、
ファイルに書かずに `sources.py render --only <ids>` の出力を使ってもかまいません。

## 事実確認のモード {#fact-checking-mode}

読み手が根拠の連なりをたどれる必要がある作業——医療、法律、金融、安全、争いのある主張、
あるいは事実確認を頼まれたとき——は、出典から根拠へ引き上げます。

① **情報源ごとに、原文どおりの引用文を結び付けます。** ページを抽出したらその本文を
ファイルに保存し、主張を支えている文を結び付けてください。

```bash
python "$S" quote 1 --text "Ice is about 9% less dense than liquid water." --from page1.txt
```

引用文は、根拠となる本文にそのまま現れないかぎり受け付けられません（空白、大文字小文字、
markdown の記号は無視します。抽出した本文の中の `_[ERAP1](https://…)_` のような
リンク記法も、読み手が見る素の文章と一致します）。ですから、言い換えや記憶違いの数値が
根拠のふりをすることはできません。取得した本文からそのまま貼り付けてください。打ち直しては
いけません。文は読み手に見えるかたちで引きます。抽出時の記法は照合側が読み飛ばしてくれるので、
リンクの書きかたやエスケープされたアスタリスクを自分で再現する必要はありません。

② **モデルの知識から書いたことには `[unverified]` を付けます。** 出典を見つけられなかった
要となる主張には、出典の代わりにこの印をはっきり付けます。

```
The refactor likely predates the 2.0 release.[unverified]
```

`verify --min-coverage` は `[unverified]` の付いた文も出どころありとして数えます。目指すのは
すべての文に出典を付けることではなく、すべての主張について出どころを申告することです。
確かめられる要点なら確かめてください。`[unverified]` は本当に確かめようがないものにだけ使い、
`[unverified]` だらけになった事実確認の成果物は、その旨をまとめに書くべきです。

③ **争いのある事実は、独立した 2 つ目の情報源で突き合わせます。** 2 つの情報源が食い違うときは、
それぞれの番号と引用文とともに両方の読み方を示し、どちらをどう重く見るかとその理由を述べます。
1 つならただの報道、独立した 2 つなら裏付けです。

④ **根拠の関門で点検し、根拠付きの一覧を組み立てます。**

```bash
python "$S" verify report.md --evidence --min-coverage 0.5
python "$S" render --style evidence --replace-in report.md
```

`--evidence` は、引用した情報源のどれかに引用文が結び付いていなければ原稿をはじきます。
`evidence` の書式は、それぞれの情報源の URL の下に引用文を並べるので、成果物の上で
主張 → 情報源 → それを支える原文までが見えるようになり、鵜呑みにする部分がなくなります。
すでにある Sources のかたまりをその場で書き換えるには `--replace-in <draft>` を使います
（何度実行しても同じ結果になるので、引用文を足したあとにやり直しても安全です）。
`--cited-in` は標準出力に書き出します。どちらも `## Sources` という見出しを付けます
（`--style plain` は `Sources:` になります）。

**`--min-coverage` が何を数えているか。** 割合は
`sentences with declared provenance / prose sentences` です。本文の文とは 4 語以上のまとまりのある空でない
行のことで、Sources のかたまりより後ろ、見出し（`#`）、表の行（`|`）、囲みの中のコードは
数えません。引用の記号は取り除いてから数えます。出どころの申告は `[n]` の出典か
`[unverified]` の印のどちらかなので、両方が付いた文も 1 回だけ数えます。まずは
しきい値なしで `verify` を実行し、`info: stats:` の行で実際の数を見てから値を決めてください。

## つまずきやすいところ {#pitfalls}

- **書いたあとで登録する。** 台帳はツールの出力から埋めるものであって、原稿から
  組み立て直すものではありません。それをやると、番号付けで消したはずの
  URL をでっち上げる危険がそのまま戻ってきます。
- **途中で番号を振り直す。** 原稿の番号を手で書き換えてはいけません。番号は台帳の中での
  その情報源そのものです。原稿が `[4]` を引用しているなら、`[4]` はその情報源のままでなければ
  なりません。`reset` は作業と作業の間だけです。
- **Sources に URL を打ち直す。** 必ず `render` を使ってください。手で打った URL は
  裏の取れていない主張です。
- **検索結果の抜粋を、本文を読んだかのように引用する。** `web_search` の説明文が支えるのは、
  そこに書かれていることだけです。本文が必要な主張なら、`web_extract` してから
  そのページを引用してください。
- **出典の付けすぎ。** 1 文につき 3 つが上限です。節ごとに出典を付けると読めなくなり、
  どの情報源が要なのかが分からなくなります。
- **コードや設定の成果物に台帳を引用する。** 出典のコメントは文章の成果物や文書の冒頭に
  書くもので、生成したコードの中に入れるものではありません。
- **サブエージェントを並行して動かす。** サブエージェントはそれぞれ別の作業場所を持ちます。
  出力をあとで合わせるなら、`--ledger`（または `HERMES_CITATION_LEDGER`）で全員を
  1 つの台帳に向けてください。そうしないと番号がぶつかります。
- **ページではなく抜粋から引用する。** 根拠となる引用文は、検索結果の説明文ではなく
  抽出したページ本文から取らなければなりません。まず `web_extract` し、本文を保存して、
  そのファイルを `quote --from` に渡します。
- **`quote --text` に言い換えを入れる。** 原文どおりかの検査ではじかれます。直し方は、
  何かが一致するまで言い換えることではなく、実際の文を探すことです。
- **`[unverified]` を逃げ道に使う。** これは本当に出典を得られない、まれな主張のための印です。
  ほとんどの文に付いているなら、足りなかったのは印ではなく調べる量です。
- **Sources を手で書き換える。** `render --replace-in <draft>` を使ってください。自分で
  切り貼りすると、古いままだったり重複したりして、`verify` に引っかかります。

## 確かめかた {#verification}

```bash
python "$S" verify report.md --strict --min-coverage 0.5
```

通れば、原稿の `[n]` がすべて台帳にあり、Sources のかたまりが引用した番号を台帳の URL
どおりに漏れなく並べていて、出典を要する文のうち出典が付いている割合がしきい値を満たしている、
ということです。終了コードが 0 のときも警告は読んでください。登録したのに引用されていない
情報源は、たいてい編集の途中で主張から出どころが外れたことを意味します。
