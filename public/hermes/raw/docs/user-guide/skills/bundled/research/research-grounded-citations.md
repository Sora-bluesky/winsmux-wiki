---
title: "Grounded Citations — 回答や文書を、出典を示せる形に裏付ける"
description: "回答や文書を、出典を示せる形に裏付ける"
upstream_path: user-guide/skills/bundled/research/research-grounded-citations.md
upstream_blob: 2768a0f3657900c57e5f4fddae9f71be5731cd80
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-grounded-citations
---

# Grounded Citations {#grounded-citations}

回答や文書を、出典を示せる形に裏付けます。

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
| 関連 skill | [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/), [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/), [`reddit-reading`](/hermes/docs/user-guide/skills/optional/social-media/social-media-reddit-reading/), [`rss-feeds`](/hermes/docs/user-guide/skills/optional/research/research-rss-feeds/), [`youtube-content`](/hermes/docs/user-guide/skills/bundled/media/media-youtube-content/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Grounded Citations {#grounded-citations}

外から取ってきた情報にもとづく記述には、すべて文中に番号付きの出典を添え、
Perplexity のように `Sources:` の一覧を末尾に置きます。`url → [n]` の対応づけは
台帳のスクリプトが持っているので、番号も URL も取得したときの結果から来ます。
記憶から書くことはありません。モデルが自分で出すのは、渡された小さな整数だけです。

失敗が許されない仕事では、同じ台帳がそのまま事実確認の連鎖になります。情報源ごとに
そのままの引用文をひも付け（取得したページ本文に文字どおり出てこない引用は弾かれます）、
モデルの知識から書いた記述には `[unverified]` の印を付け、
`verify --evidence` は引用文の付いていない情報源を挙げた原稿を不合格にします。

この skill が扱うのは、チャットでの回答、書き上げる文書（markdown、PDF、docx、
スライド）、そして調査レポートです。学術論文の BibTeX の流れは扱いません。
学会論文には `arxiv` skill を使ってください。この skill はそちらへ
つなぐ側です（`references/citation-formats.md` を参照してください）。

## こんなときに使います {#when-to-use}

自分が知っていたことではなく、取ってきた情報にもとづいて回答や成果物を作るときは、
いつでも使います。

- 調査、比較、ニュースのまとめ、「X の現状はどうなっているか」
- 外部の事実を引用・要約・報告してディスクに書き出すもの全般。
  レポート、ブリーフ、ドキュメント、スライド、ウィキのページなど
- 利用者があとから裏を取りたくなるような事実調べ
- 食い違う情報源をそれぞれの出どころに帰属させる必要がある、複数情報源のまとめ

取得がついでに起きただけのときは、文中の出典を省いてかまいません。コーディングの
途中で文法やバージョンをさっと調べた、雑談、創作などです。
利用者がリンクを欲しがりそうなときだけ URL に触れてください。

## 事前に必要なもの {#prerequisites}

ふつうの道具立て以外には何も要りません。`scripts/sources.py` は標準ライブラリだけで動く Python 3 です。
情報の取得は、その環境で使えるものを使います。`web_search`、`web_extract`、
`browser_navigate`、`terminal`（curl や各種 CLI）などです。

台帳の置き場所: `$HERMES_HOME/cache/citations/ledger.json`（プロファイルごとに分かれます）。
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
常に同じ番号が返るので、検索と抽出を何度くり返しても番号は動きません。

## 早見表 {#quick-reference}

| やりたいこと | コマンド |
|---|---|
| 新しい作業のために台帳を作り直す | `sources.py reset` |
| 情報源を登録して番号を受け取る | `sources.py add <url> [--title T]` |
| まとめて登録する | `sources.py add <url1> <url2> ...` |
| ツールの JSON 出力から登録する | `sources.py ingest results.json` |
| 情報源にそのままの引用文をひも付ける | `sources.py quote <id> --text "exact wording" --from page.txt` |
| 台帳を表示する | `sources.py list [--json]` |
| Sources のまとまりを組み立てる | `sources.py render [--style markdown\|plain\|footnotes\|bibtex\|evidence] [--only 1,3]` |
| 原稿が挙げている分だけ組み立てる | `sources.py render --cited-in draft.md` |
| 原稿の Sources のまとまりをその場で書き換える | `sources.py render --replace-in draft.md` |
| 原稿の出典を点検する | `sources.py verify draft.md [--strict] [--min-coverage 0.6] [--evidence]` |

## 手順 {#procedure}

① 裏付けのある回答や文書を作る作業の最初に、**台帳を作り直します**。すでに原稿へ番号を
書き込んだ続きの作業なら、作り直さないでください。台帳を使い回すほうが番号が安定します。

② **情報源は取得したその場で登録します。** `web_search` / `web_extract` /
`browser_navigate` / 取得のたびに、URL を `sources.py add` に渡します
（生の JSON をそのまま `sources.py ingest` に流してもかまいません）。これを文章を書く
*前に* やってください。あとから記憶を頼りに登録するのが、この skill が防ごうとしている
失敗のしかたです。

③ **書きながら出典を付けます。** その情報源が支えている文のすぐうしろに、角かっこ付きの
番号を置きます。

```
Ice floats because it is less dense than liquid water.[1][2]
```

- 角かっこの前に空白は入れません。番号はひとつずつ別の角かっこに入れます。
- 1 文につき番号は 3 つまで。文ごとに付け、最後にまとめて並べません。
- 台帳が返した番号だけを使います。番号も URL も、決して作り出しません。
- 自分の知識から書いた記述には出典を付けません。
- 情報源が食い違うときは、両方の読み方をそれぞれの番号付きで並べます。
- 数値、日付、名前は情報源が書いているとおりに引きます。分からないところは
  ならして書かず、「X についての情報源は見つからなかった」とはっきり書きます。

④ **Sources のまとまりを末尾に足します。** `sources.py render --cited-in <draft>` を使えば、
番号と URL の対応が台帳から機械的に作られ、打ち直しになりません。
markdown 以外に出すときは合う `--style` を選び、置き場所は
`references/citation-formats.md` に従ってください（docx なら脚注、
PDF や LaTeX なら文末脚注、スライドなら Sources のページ、ウィキならページごとの一覧）。

⑤ **渡す前に点検します。** `sources.py verify <draft>` は、台帳に無い番号があるとき、
Sources のまとまりが台帳と食い違っているとき、あるいは（`--min-coverage` を付けた場合に）
出典が薄すぎるときに、0 以外で終了します。直してもう一度走らせてください。

⑥ **チャットでの回答**も同じ流れで、原稿の代わりに自分の返信を使います。情報源を登録し、
文中に出典を付け、最後に組み立てた `Sources:` の一覧を置きます。短い回答なら、ファイルに
書かずに `sources.py render --only <ids>` でまとまりを作ってもかまいません。

## 複数のプラットフォームを横断して集める {#multi-platform-sweeps}

「X について何が言われているか」「X をウェブ全体で調べて」は、`web_search` 一回では
ありません。情報の種類ごとに手を広げ、並行して集め、それぞれの記述をどこから来たものか
明示したうえでまとめます。

| 情報の種類 | 経路 | そこから得られるもの |
|---|---|---|
| 一般のウェブ | `web_search` → `web_extract` | 公式ドキュメント、記事、発表 |
| コミュニティの議論 | `reddit-reading`（`search`、`thread`） | 実際の使用感、不満、回避策 |
| ブログ / リリース / 更新履歴 | `rss-feeds`（`read`、`discover`） | 日付の付いた一次投稿、版の移り変わり |
| 動画 | `youtube-content` | 操作の実演、デモ、講演 |
| コード | `terminal` で `gh search repos` / `gh search issues` | 実装例、未解決の不具合 |
| X/Twitter | `xurl`（API の利用権が要ります） | 発表、開発者どうしのやりとり |

`reddit-reading` と `rss-feeds` は追加で導入する skill です。入っていない場合は、使う前に
`hermes skills install official/social-media/reddit-reading` か
`hermes skills install official/research/rss-feeds` で入れてください。

どの経路から来た URL も、届いた時点で台帳に登録します（手順②）。意見と実測は分けて
おいてください。Reddit のスレッドは、利用者が何かを*そう言っている*ことの証拠であって、
それが本当だという証拠ではありません。一次情報と組み合わせるか、感触として扱ってください。
うまくいったものだけに黙って絞り込むのではなく、経路ごとに足りなかった範囲
（「Reddit の検索では 3 月より新しいものは出てこなかった」など）を報告します。

## 事実確認モード {#fact-checking-mode}

読み手が裏付けの連鎖をたどれる必要がある仕事、つまり医療、法務、金融、安全、
議論の分かれる主張、あるいは事実確認そのものを頼まれたときは、
出典を付けるだけでなく根拠まで引き上げます。

① **情報源ごとに、そのままの引用文をひも付けます。** ページを抽出したらその本文を
ファイルに保存し、各記述を支える文をひも付けます。

```bash
python "$S" quote 1 --text "Ice is about 9% less dense than liquid water." --from page1.txt
```

引用文は、根拠となる本文に文字どおり出てこない限り弾かれます
（空白、大文字小文字、markdown の記号は無視されます。抽出された本文の中の
`_[ERAP1](https://…)_` のような文中リンクは、読み手が見る素の文章と同じものとして扱われます）。
言い換えや、うろ覚えの数値が根拠のふりをすることはできません。
取ってきた本文からコピーして貼ってください。打ち直しは禁物です。読み手が見るとおりの文を
引いてください。抽出側の記号は照合の側が見通してくれるので、リンクの書き方や
エスケープしたアスタリスクを引用文で再現する必要はありません。

② **モデルの知識から書いた記述には `[unverified]` の印を付けます。** 論の支えになる記述で
出典を見つけられなかったものには、出典の代わりにはっきりと印を付けます。

```
The refactor likely predates the 2.0 release.[unverified]
```

`verify --min-coverage` は `[unverified]` の付いた文も出どころのある文として数えます。
目指しているのは、すべての文に出典を付けることではなく、すべての記述に出どころを
宣言することだからです。
確かめられる大事な記述なら確かめてください。`[unverified]` は本当に確かめようがないもののための
印であり、`[unverified]` だらけの事実確認の成果物なら、そのことを要約に書くべきです。

③ **争いのある事実は、独立した二つ目の情報源と突き合わせます。** 二つの情報源が食い違うときは、
どちらの読み方も自分の番号と引用文を付けて示し、どちらをどう重く見るかとその理由を書きます。
情報源がひとつなら、それは報道です。独立した二つがあって、はじめて裏付けになります。

④ **根拠の関門で点検し、根拠付きのまとまりを組み立てます。**

```bash
python "$S" verify report.md --evidence --min-coverage 0.5
python "$S" render --style evidence --replace-in report.md
```

`--evidence` は、挙げた情報源のどれかに引用文が付いていないと原稿を不合格にします。
`evidence` の表示形式は、情報源ごとに URL の下へ引用文を並べます。成果物の上で
「記述 → 情報源 → それを支える正確な文言」がつながり、鵜呑みにする部分がなくなります。
すでにある Sources のまとまりをその場で書き換えるには `--replace-in <draft>` を使います
（何度実行しても同じ結果になるので、引用文を足したあとに再実行しても安全です）。`--cited-in` のほうは
標準出力に出します。どちらも見出しは `## Sources` になります（`--style plain` なら
`Sources:` です）。

**`--min-coverage` が数えているもの。** 割合は
`sentences with declared provenance / prose sentences` です。ここでいう文とは、
Sources のまとまり以降を除いたうえで、見出し（`#`）、表の行（`|`）、コードのまとまりを
落とし、引用の記号を外したあとに残る、4 語以上の空でない行の断片です。
出どころの宣言は `[n]` の出典か `[unverified]` の印のどちらかで、両方ある文は一度だけ数えます。
数値を決める前に、まず閾値なしで `verify` を走らせ、`info: stats:` の行で件数を見てください。

## つまずきやすいところ {#pitfalls}

- **書いたあとで登録する。** 台帳はツールの出力から埋めるものであって、原稿から
  作り直すものではありません。それをやると、番号付けで消したはずの
  「URL をでっち上げる」危険がそのまま戻ってきます。
- **途中で番号を振り直す。** 原稿の番号を手で書き換えないでください。番号は台帳における
  その情報源の身元です。原稿が `[4]` を挙げているなら、`[4]` はその情報源のままでなければ
  なりません。`reset` は作業と作業のあいだにだけ実行します。
- **URL を Sources のまとまりに打ち直す。** 必ず `render` を使ってください。手で打った URL は
  裏の取れていない主張です。
- **検索結果の要約を、ページを読んだかのように挙げる。** `web_search` の説明文が支えるのは、
  そこに文字どおり書いてあることだけです。本文が必要な記述なら、
  `web_extract` してからそのページを挙げてください。
- **付けすぎる。** 1 文に番号 3 つが上限です。節ごとに出典を付けると読みにくくなり、
  どの情報源が主に支えているのかも見えなくなります。
- **コードや設定の成果物に台帳を持ち込む。** 出典のコメントが入るのは文章の成果物と
  ドキュメントの冒頭であって、生成したコードの中ではありません。
- **サブエージェントを並列で走らせる。** サブエージェントはそれぞれ別の作業ディレクトリを
  持ちます。出力をあとで合わせるなら、`--ledger`（または `HERMES_CITATION_LEDGER`）で
  全員を同じ台帳に向けてください。そうしないと番号がぶつかります。
- **ページではなく要約から引用する。** 根拠の引用文は抽出したページ本文から取ります。
  検索結果の説明文からではありません。まず `web_extract` し、本文を保存し、
  そのファイルを `quote --from` に渡してください。
- **`quote --text` に言い換えを入れる。** そのままかどうかの検査で弾かれます。直し方は、
  何かが通るまで言い換えることではなく、実際の文を探すことです。
- **`[unverified]` を逃げ道にする。** これは本当に出典を出しようがない、まれな記述のための
  印です。ほとんどの文に付いているなら、その仕事に足りなかったのは印ではなく、
  もっと調べることでした。
- **Sources のまとまりを手で書き換える。** `render --replace-in <draft>` を使ってください。
  自分でファイルを切り貼りすると、古いまとまりや二重のまとまりが残り、`verify` に引っかかります。

## 確認 {#verification}

```bash
python "$S" verify report.md --strict --min-coverage 0.5
```

通ったということは、原稿の中のすべての `[n]` が台帳にあり、Sources のまとまりが挙げた番号と
台帳の URL にぴたり一致していて、出典の付くべき文のうち実際に付いている割合が閾値に
届いている、ということです。終了コードが 0 でも警告は読んでください。登録したのに
挙げられていない情報源があるときは、たいてい編集の途中でどこかの記述が出典を失っています。
