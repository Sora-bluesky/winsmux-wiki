---
title: "Grounded Citations — 回答や文書を、出典を示せる形で裏付ける"
description: "回答や文書を、出典を示せる形で裏付ける"
upstream_path: user-guide/skills/bundled/research/research-grounded-citations.md
upstream_blob: 8166801512bdc8093a8b14fa355d1b35217b1196
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-grounded-citations
---

# Grounded Citations {#grounded-citations}

回答や文書を、出典を示せる形で裏付けます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/research/grounded-citations` |
| バージョン | `1.2.0` |
| 作者 | Hermes Agent + Teknium |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Research`, `Citations`, `Grounding`, `Sources`, `Web`, `Reports` |
| 関連 skill | [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/), [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/), [`reddit-reading`](/hermes/docs/user-guide/skills/bundled/social-media/social-media-reddit-reading/), [`rss-feeds`](/hermes/docs/user-guide/skills/bundled/research/research-rss-feeds/), [`youtube-content`](/hermes/docs/user-guide/skills/bundled/media/media-youtube-content/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Grounded Citations {#grounded-citations}

外部の情報源から取ってきた主張には、文中に番号付きの出典を入れ、末尾に `Sources:`
の一覧を付けます。Perplexity のような形です。`url → [n]` の対応は台帳のスクリプトが
持っているので、番号も URL も取得結果から出てきます。記憶から出てくることはありません。
モデルが書くのは、渡された小さな整数だけです。

失敗が許されない仕事では、同じ台帳がそのまま裏取りの連鎖になります。情報源ごとに
そのままの引用文を結び付け（取ってきたページの本文に文字どおり現れないかぎり受け付けません）、
モデルの知識から出た主張には `[unverified]` の印を付け、`verify --evidence` は
引用した情報源に根拠が付いていない原稿を落とします。

この skill が扱うのは、チャットでの回答、書き上げる文書（マークダウン、PDF、docx、
スライド）、調査レポートです。学術用の BibTeX のパイプラインは扱いません。学会論文には
`arxiv` skill を使ってください。この skill はそちらへ材料を渡します
（`references/citation-formats.md` を参照）。

## 使いどころ {#when-to-use}

知っていたことではなく、取ってきた情報に回答や成果物が乗っているときは、いつでも使ってください。

- 調査、比較、ニュースの要約、「X の現状は？」といった問い
- ディスクに書き出す成果物のうち、外部の事実を引用・言い換え・報告するものすべて。
  レポート、ブリーフ、ドキュメント、スライド、ドキュメントサイトのページなど
- 利用者が裏を取りたくなるような事実調べ
- 情報源が食い違っていて、どれがどこから来たかを示す必要がある複数出典のまとめ

取得がほかの作業のついででしかないときは、文中の出典は省いてかまいません。コーディングの
途中で文法やバージョンをさっと調べたとき、雑談、創作などです。URL に触れるのは、利用者が
そのリンクを欲しがりそうなときだけにしてください。

## 前提 {#prerequisites}

ふつうのツール一式のほかに要るものはありません。`scripts/sources.py` は標準ライブラリだけの Python 3 です。
取得は設定されているものを何でも使います。`web_search`、`web_extract`、
`browser_navigate`、`terminal`（curl や各種 CLI）などです。

台帳の場所は `$HERMES_HOME/cache/citations/ledger.json` です（プロファイルごとに分かれます）。
作業ごとに変えたいときは `--ledger <path>` か `HERMES_CITATION_LEDGER` で上書きします。

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

`add` は何度実行しても同じ結果になり、URL は正規化されます。同じページなら同じ台帳の中で
必ず同じ番号が返るので、検索と抽出を何度繰り返しても番号がずれません。

## 早見表 {#quick-reference}

| やりたいこと | コマンド |
|---|---|
| 新しい作業のために台帳を作り直す | `sources.py reset` |
| 情報源を登録して番号をもらう | `sources.py add <url> [--title T]` |
| まとめて登録する | `sources.py add <url1> <url2> ...` |
| ツールの JSON 出力から登録する | `sources.py ingest results.json` |
| 情報源にそのままの引用文を結び付ける | `sources.py quote <id> --text "exact wording" --from page.txt` |
| 台帳を表示する | `sources.py list [--json]` |
| Sources のまとまりを組み立てる | `sources.py render [--style markdown\|plain\|footnotes\|bibtex\|evidence] [--only 1,3]` |
| 原稿が引用しているものだけを組み立てる | `sources.py render --cited-in draft.md` |
| 原稿の Sources のまとまりをその場で書き換える | `sources.py render --replace-in draft.md` |
| 原稿の出典を検査する | `sources.py verify draft.md [--strict] [--min-coverage 0.6] [--evidence]` |

## 手順 {#procedure}

① 裏付けのある回答や文書を作る作業を始めるときに、**台帳を作り直します**。すでに原稿に番号が
入っている作業の続きなら、作り直さないでください。台帳を使い回すことで、番号が動かずに済みます。

② **情報源は取ってきたその場で登録します。** `web_search` / `web_extract` /
`browser_navigate` / 取得のたびに、URL を `sources.py add` に渡してください
（生の JSON をそのまま `sources.py ingest` に流してもかまいません）。これを文章を書く *前* に
やります。あとから記憶を頼りに登録するのが、この skill が防ごうとしている失敗そのものです。

③ **書きながら出典を付けます。** その情報源が裏付けている文のすぐ後ろに、角かっこ付きの
番号を置いてください。

```
Ice floats because it is less dense than liquid water.[1][2]
```

- かっこの前に空白を入れません。番号はひとつずつ別のかっこに入れます。
- 1文につき番号は3つまで。文ごとに付け、最後にまとめて並べないでください。
- 台帳が返した番号だけを使います。番号も URL も、決して作らないでください。
- 自分の知識から出た主張には出典を付けません。
- 情報源が食い違うときは、両方の読み方をそれぞれの番号付きで示します。
- 数値、日付、名前は情報源の書きぶりのまま引きます。抜けているところは
  ならさずに、「X の出典は見つからなかった」とはっきり書いてください。

④ **Sources のまとまりを末尾に付けます。** `sources.py render --cited-in <draft>` を使えば、
番号と URL の対応が台帳から機械的に組み立てられ、打ち直しになりません。
マークダウン以外に書き出すときは合う `--style` を選び、置き場所は
`references/citation-formats.md` に従ってください（docx なら脚注、PDF や LaTeX なら文末注、
スライドなら Sources のページ、ドキュメントサイト向けの出力ならページごとの出典一覧です）。

⑤ **渡す前に検査します。** `sources.py verify <draft>` は、知らない番号があるとき、Sources の
まとまりが台帳と食い違うとき、（`--min-coverage` を付けたときは）文章に対して出典が薄すぎるときに、
0 以外で終了します。直して、もう一度走らせてください。

⑥ **チャットでの回答**も同じ流れです。返信そのものを原稿と見なして、情報源を登録し、
文中に出典を付け、最後に組み立てた `Sources:` の一覧で締めます。短い回答なら、ファイルに書かずに
`sources.py render --only <ids>` でまとまりを出してもかまいません。

## 複数のプラットフォームを横断して調べる {#multi-platform-sweeps}

「X について何が言われているか」「X をウェブ全体で調べて」は、`web_search` 1回では終わりません。
情報源の種類ごとに手を広げ、並行して集め、どの主張がどのプラットフォームから来たかを示しながら
まとめてください。

| 情報源の種類 | 経路 | そこから得られるもの |
|---|---|---|
| 一般のウェブ | `web_search` → `web_extract` | 公式ドキュメント、記事、発表 |
| コミュニティの議論 | `reddit-reading`（`search`、`thread`） | 実際に使った人の声、不満、回避策 |
| ブログ / リリース / 更新履歴 | `rss-feeds`（`read`、`discover`） | 日付の付いた一次投稿、版の移り変わり |
| 動画 | `youtube-content` | 操作の実演、デモ、講演 |
| コード | `terminal` から `gh search repos` / `gh search issues` | 実装、未解決の不具合 |
| X/Twitter | `xurl`（API へのアクセスが必要） | 発表、開発者どうしのやりとり |

どの経路から来た URL も、届いたそばから台帳に登録します（手順②）。意見と実測は分けて
ください。Reddit のスレッドは、利用者がそう *言っている* ことの証拠であって、それが本当だという
証拠ではありません。一次情報と組にするか、感触として扱ってください。プラットフォームごとに
見きれていない範囲があれば（「Reddit の検索では3月より新しいものが出てこなかった」など）、
うまくいったものだけに黙って絞らずに報告してください。

## 裏取りモード {#fact-checking-mode}

読み手が根拠の連鎖をたどれる必要がある仕事、つまり医療、法律、金融、安全、争いのある主張、
あるいは利用者から裏取りを頼まれたときは、出典から根拠へ引き上げてください。

① **情報源ごとに、そのままの引用文を結び付けます。** ページを抽出したら本文をファイルに保存し、
それぞれの主張を支えている文を結び付けます。

```bash
python "$S" quote 1 --text "Ice is about 9% less dense than liquid water." --from page1.txt
```

引用文は、根拠となる本文に文字どおり現れないかぎり受け付けられません
（空白、大文字小文字、マークダウンの記号は無視されます。抽出された本文の中の
`_[ERAP1](https://…)_` のような文中リンクは、読み手が目にする素の文章と一致します）。
言い換えや、うろ覚えの数字が根拠になりすますことはできません。
取ってきた本文からコピーして貼ってください。打ち直しは禁物です。引用は読み手が目にする形の
文にしてください。抽出ツールの記号は照合側が見通してくれるので、リンクの書き方や
エスケープされたアスタリスクを引用文で再現する必要はありません。

② **モデルの知識から出た主張には `[unverified]` を付けます。** 出典を見つけられなかった、
それでいて論の支えになっている主張には、出典の代わりにはっきり印を付けます。

```
The refactor likely predates the 2.0 release.[unverified]
```

`verify --min-coverage` は `[unverified]` の付いた文も「出どころが示されている」と数えます。
目標は、すべての文に出典を付けることではなく、すべての主張について出どころを申告することです。
大事な主張が確かめられるものなら確かめてください。`[unverified]` は本当に確かめようがないものに
使う印で、`[unverified]` だらけになった裏取りの成果物は、そのことを要約で述べるべきです。

③ **争いのある事実は、独立した2つ目の情報源と突き合わせます。** 2つの情報源が食い違うときは、
両方の読み方をそれぞれの番号と引用文とともに示し、どちらをどういう理由で重く見るかを書いてください。
1つは報道ですが、独立した2つは裏付けになります。

④ **根拠のゲートで検査し、根拠付きのまとまりを組み立てます。**

```bash
python "$S" verify report.md --evidence --min-coverage 0.5
python "$S" render --style evidence --replace-in report.md
```

`--evidence` は、引用した情報源のどれかに引用文が付いていなければ原稿を落とします。
`evidence` の書式で組み立てると、情報源ごとの引用文がその URL の下に並ぶので、成果物の上で
主張 → 情報源 → それを支える文言が全部見え、鵜呑みにするところがなくなります。既にある Sources の
まとまりをその場で書き換えるには `--replace-in <draft>` を使ってください（何度実行しても同じ結果に
なるので、引用文を足したあとに走らせ直しても安全です）。`--cited-in` は標準出力に出します。
どちらも見出しは `## Sources` です（`--style plain` のときは `Sources:` になります）。

**`--min-coverage` が数えているもの。** 割合は
`sentences with declared provenance / prose sentences`（出どころが示された文 ÷ 本文の文）です。本文の文とは、Sources のまとまりより後ろ、
見出し（`#`）、表の行（`|`）、コードブロックを除いた、4語以上の空でない行のかたまりのことです。
引用ブロックの記号は取り除かれます。出どころは `[n]` の出典か `[unverified]` の印で示され、
両方ある文も1回だけ数えます。まずはしきい値なしで `verify` を走らせ、`info: stats:` の行で
実際の数を見てから数字を決めてください。

## つまずきやすいところ {#pitfalls}

- **書いたあとで登録する。** 台帳はツールの出力から埋めるものであって、原稿から組み立て直す
  ものではありません。それをやると、番号付けで消したはずの URL の捏造がそのまま戻ってきます。
- **作業の途中で番号を振り直す。** 原稿の番号を手で書き換えないでください。番号は台帳の
  身元です。原稿が `[4]` を引いているなら、`[4]` はその情報源のままでなければなりません。
  `reset` は作業と作業のあいだにだけ実行します。
- **Sources のまとまりに URL を打ち直す。** 必ず `render` を使ってください。手で打った URL は
  裏の取れていない主張です。
- **検索結果の抜粋を、ページを読んだかのように引く。** `web_search` の説明文が支えるのは、
  そこに文字どおり書いてあることだけです。本文が要る主張には、抽出したページを引いてください。
  先に `web_extract` します。
- **付けすぎる。** 1文に番号3つが上限です。節ごとに出典を付けると読めなくなり、
  どの情報源が支えているのかも分からなくなります。
- **コードや設定の成果物に台帳を引く。** 出典のコメントは文章の成果物やドキュメントの
  冒頭に置くもので、生成したコードの中に入れるものではありません。
- **サブエージェントを並行して動かす。** サブエージェントはそれぞれ別の作業ディレクトリを
  持ちます。出力をあとで合わせるなら、`--ledger`（または `HERMES_CITATION_LEDGER`）で
  全員を同じ台帳に向けてください。そうしないと番号がぶつかります。
- **ページではなく抜粋から引用する。** 根拠の引用文は、検索結果の説明文ではなく抽出した
  ページの本文から取らなければなりません。先に `web_extract` して本文を保存し、そのファイルを
  `quote --from` に渡します。
- **`quote --text` に言い換えを入れる。** そのままかどうかの検査で落ちます。直し方は、
  何かが通るまで言葉をこねることではなく、実際の文を探すことです。
- **`[unverified]` を逃げ道に使う。** これは本当に出典を出しようがない、まれな主張に付ける
  印です。ほとんどの文にこれが付くなら、その作業に足りなかったのは印ではなく取得です。
- **Sources のまとまりを手で編集する。** `render --replace-in <draft>` を使ってください。
  自分でファイルを切り貼りすると、古いままのまとまりや二重になったまとまりが残り、
  `verify` に引っかかります。

## 確認 {#verification}

```bash
python "$S" verify report.md --strict --min-coverage 0.5
```

通ったということは、原稿の中のすべての `[n]` が台帳に存在し、Sources のまとまりが引用した番号を
台帳の URL でちょうど並べていて、出典が要る文のうち出典の付いた割合がしきい値を満たしている、
ということです。終了コードが 0 でも警告は読んでください。登録したのに引かれていない情報源は、
たいてい編集の途中でどこかの主張が出典を落としたしるしです。
