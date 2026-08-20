---
title: "Spike — 作り込む前に、使い捨ての試作で見込みを確かめます"
description: "作り込む前に、使い捨ての試作で見込みを確かめます"
upstream_path: user-guide/skills/bundled/software-development/software-development-spike.md
upstream_blob: 56c0954b6980d2aa228e81335fe4f9409d23916e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-spike
---

# Spike {#spike}

作り込む前に、使い捨ての試作で見込みを確かめます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development/spike` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent（gsd-build/get-shit-done を元にしています） |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `spike`, `prototype`, `experiment`, `feasibility`, `throwaway`, `exploration`, `research`, `planning`, `mvp`, `proof-of-concept` |
| 関連 skill | [`sketch`](/hermes/docs/user-guide/skills/bundled/creative/creative-sketch/), [`subagent-driven-development`](/hermes/docs/user-guide/skills/optional/software-development/software-development-subagent-driven-development/), [`plan`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-plan/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Spike {#spike}

本格的に作り始める前に、**アイデアの手ざわりを確かめたい**ときにこの skill を使います。実現できそうかを見る、いくつかの方法を比べる、いくら調べても答えの出ない未知を洗い出す、といった用途です。spike は最初から捨てる前提で作ります。役目を果たしたら、そのまま捨ててください。

利用者が「ちょっと試してみたい」「X が動くか見たい」「spike してみて」「Y に決める前に」「Z を手早く試作して」「そもそも可能なの?」「A と B を比べて」といった言い方をしたら、これを読み込みます。

## 使わないほうがよい場面 {#when-not-to-use-this}

- ドキュメントを読むかコードを追えば答えが出る場合。作らずに調べるだけにします
- 本番向けの作業である場合。`plan` skill を使います
- すでに見込みが立っている場合。そのまま実装に進みます

## GSD 一式が入っている場合 {#if-the-user-has-the-full-gsd-system-installed}

`gsd-spike` が隣に見えているなら（`npx get-shit-done-cc --hermes` で入れた場合）、GSD の流れをひと通り使いたいときは **`gsd-spike`** のほうを選びます。`.planning/spikes/` に状態を残し、MANIFEST でセッションをまたいで追いかけ、Given/When/Then の形で結論を書き、GSD の他の部分に合わせたコミットの型も持っています。この skill は、GSD 一式を持っていない（あるいは使いたくない）人向けの、単体で動く軽い版です。

## 基本の進め方 {#core-method}

規模にかかわらず、spike はこのくり返しで進みます。

```
decompose  →  research  →  build  →  verdict
   ↑__________________________________________↓
                  iterate on findings
```

### 1. 分解する {#1-decompose}

利用者のアイデアを、**互いに独立した 2〜5 個の「できるか」という問い**に割ります。問い 1 つが spike 1 つです。Given/When/Then の形にして、表で示します。

| # | Spike | 確かめること（Given/When/Then） | リスク |
|---|-------|----------------------------|------|
| 001 | websocket-streaming | WS の接続がある状態で、LLM がトークンを流したとき、クライアントが &lt; 100ms でチャンクを受け取る | 高 |
| 002a | pdf-parse-pdfjs | 複数ページの PDF がある状態で、pdfjs で解析したとき、構造を保ったテキストが取り出せる | 中 |
| 002b | pdf-parse-camelot | 複数ページの PDF がある状態で、camelot で解析したとき、構造を保ったテキストが取り出せる | 中 |

**spike の型:**
- **standard** — 1 つの問いに、1 つのやり方で答える
- **comparison** — 同じ問いに、違うやり方で答える（番号を共有し、`a` / `b` / `c` の接尾辞を付ける）

**よい spike の問い:** 具体的な「できるか」で、結果が目に見えるもの。
**よくない spike の問い:** 広すぎる、結果が見えない、あるいは「X についてドキュメントを読む」だけのもの。

**リスクの高い順に並べます。** アイデアを潰す見込みがいちばん高い spike を先にやります。難所が動かないなら、易しいところを試作しても意味がありません。

**分解を飛ばしてよい**のは、利用者がもう何を spike したいかをはっきり決めていて、そう言っている場合だけです。そのときは、そのアイデアを 1 つの spike として扱います。

### 2. すり合わせる（spike が複数ある場合） {#2-align-for-multi-spike-ideas}

spike の表を示し、「この順で全部やりますか、それとも調整しますか?」と尋ねます。コードを書き始める前に、落とす・並べ替える・言い直す機会を渡します。

### 3. 下調べする（spike ごとに、作る前に） {#3-research-per-spike-before-building}

spike は調べものをしないという意味ではありません。やり方を選べるところまで調べて、そこから作ります。spike ごとに次を行います。

1. **手短にまとめます。** 2〜3 文で、この spike が何で、なぜ大事で、いちばんの危うさはどこか。
2. 選択肢が本当にあるなら、**競合するやり方を並べます。**

   | やり方 | ツール / ライブラリ | よい点 | 悪い点 | 状況 |
   |----------|-------------|------|------|--------|
   | ... | ... | ... | ... | 保守されている / 放置されている / ベータ |

3. **1 つ選びます。** 理由も書きます。有力なものが 2 つ以上あるなら、その spike の中で手早く両方作ります。
4. 外部に依存しない純粋なロジックなら、**下調べは飛ばします。**

下調べには Hermes のツールを使います。

- `web_search("python websocket streaming libraries 2025")` — 候補を探す
- `web_extract(urls=["https://websockets.readthedocs.io/..."])` — 実際のドキュメントを読む（markdown で返ります）
- `terminal("pip show websockets | grep Version")` — プロジェクトの venv に何が入っているか確かめる

ドキュメントのページがないライブラリは、clone して `README.md` や `examples/` を `read_file` で読みます。Context7 MCP を設定しているなら、そちらも良い情報源です（`mcp_*_resolve-library-id` のあとに `mcp_*_query-docs`）。

### 4. 作る {#4-build}

spike 1 つにつき 1 ディレクトリ。それだけで動く形にします。

<!-- ascii-guard-ignore -->
```
spikes/
├── 001-websocket-streaming/
│   ├── README.md
│   └── main.py
├── 002a-pdf-parse-pdfjs/
│   ├── README.md
│   └── parse.js
└── 002b-pdf-parse-camelot/
    ├── README.md
    └── parse.py
```
<!-- ascii-guard-ignore-end -->

**利用者が手を動かせるものを作ります。** spike が失敗するのは、出てくるものが「動きました」というログ 1 行しかないときです。利用者は、spike が動く様子を*体で*確かめたいのです。既定では、次の順に選びます。

1. 入力を受け取り、目に見える出力を返すコマンド
2. ふるまいを見せるだけの、最小の HTML ページ
3. エンドポイントが 1 つだけの、小さな Web サーバー
4. 問いをそのまま確かめられる、わかりやすいアサーション付きの単体テスト

**速さより深さ。** うまくいく道筋を 1 回通しただけで「動きました」と言ってはいけません。境目の条件も試します。意外な結果が出たら、そこを追います。結論が信じられるのは、調べ方が誠実だったときだけです。

その spike にどうしても必要でないかぎり、**避けるもの**があります。込み入ったパッケージ管理、ビルドツールやバンドラ、Docker、env ファイル、設定の仕組み。値は全部べた書きでかまいません。spike なのですから。

**spike を 1 つ作るときの**、よくあるツールの並びです。

```
terminal("mkdir -p spikes/001-websocket-streaming")
write_file("spikes/001-websocket-streaming/README.md", "# 001: websocket-streaming\n\n...")
write_file("spikes/001-websocket-streaming/main.py", "...")
terminal("cd spikes/001-websocket-streaming && python3 main.py")
# Observe output, iterate.
```

**比較の spike（002a / 002b）は任せます。** 2 つのやり方を同時に進められて、どちらも 10 行の試作では済まない作り込みが要るなら、`delegate_task` で振り分けます。

```
delegate_task(tasks=[
    {"goal": "Build 002a-pdf-parse-pdfjs: ...", "toolsets": ["terminal", "file", "web"]},
    {"goal": "Build 002b-pdf-parse-camelot: ...", "toolsets": ["terminal", "file", "web"]},
])
```

サブエージェントはそれぞれ自分の結論を返します。突き合わせの比較は、あなたが書きます。

### 5. 結論 {#5-verdict}

各 spike の `README.md` は、次で締めます。

```markdown
## Verdict: VALIDATED | PARTIAL | INVALIDATED

### What worked
- ...

### What didn't
- ...

### Surprises
- ...

### Recommendation for the real build
- ...
```

**VALIDATED** = 中心の問いに、証拠つきで「できる」と答えが出た。
**PARTIAL** = X、Y、Z という条件の下でなら動く。その条件を書き残します。
**INVALIDATED** = この理由で動かない。これも spike としては成功です。

## 比較の spike {#comparison-spikes}

同じ問いに 2 つのやり方で答える場合（002a / 002b）は、**続けて**作り、最後に突き合わせて比べます。

```markdown
## Head-to-head: pdfjs vs camelot

| Dimension | pdfjs (002a) | camelot (002b) |
|-----------|--------------|----------------|
| Extraction quality | 9/10 structured | 7/10 table-only |
| Setup complexity | npm install, 1 line | pip + ghostscript |
| Perf on 100-page PDF | 3s | 18s |
| Handles rotated text | no | yes |

**Winner:** pdfjs for our use case. Camelot if we need table-first extraction later.
```

## フロンティアモード（次に何を spike するか選ぶ） {#frontier-mode-picking-what-to-spike-next}

すでに spike がいくつかあり、利用者が「次は何を spike すべき?」と尋ねたら、既存のディレクトリをたどって次を探します。

- **つなぎ目のリスク** — 見込みの立った spike 2 つが同じ資源に触れているのに、別々にしか試していない
- **データの受け渡し** — spike A の出力が spike B の入力に合うと決めつけていて、確かめていない
- **構想の穴** — できる前提になっているのに、確かめていない機能
- **別のやり方** — PARTIAL や INVALIDATED になった spike に対する、違う角度からの案

候補を 2〜4 個、Given/When/Then の形で示し、利用者に選んでもらいます。

## 成果物 {#output}

- リポジトリのルートに `spikes/` を作ります（利用者が GSD の流儀なら `.planning/spikes/`）
- spike 1 つにつき 1 ディレクトリ。`NNN-descriptive-name/` の形にします
- spike ごとの `README.md` に、問い、やり方、結果、結論を残します
- コードは捨てる前提のままにします。「本番向けに整えるのに 2 日かかる」spike は、spike のやり方を間違えています

## 出どころ {#attribution}

GSD（Get Shit Done）プロジェクトの `/gsd-spike` ワークフローを元にしています — MIT © 2025 Lex Christopherson（[gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)）。GSD 一式には、spike の状態を残す仕組み、MANIFEST での追跡、仕様から進める開発の流れ全体との連携があります。導入は `npx get-shit-done-cc --hermes --global` です。
