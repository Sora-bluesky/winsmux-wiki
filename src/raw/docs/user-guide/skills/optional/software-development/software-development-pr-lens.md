---
title: "Pr Lens — コードの変更を、動く構成図・データフロー図の SVG として描く"
description: "コードの変更を、動く構成図・データフロー図の SVG として描く"
upstream_path: user-guide/skills/optional/software-development/software-development-pr-lens.md
upstream_blob: a1dffef3bc1d3925015de7d29f8aed716da2b667
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/software-development/software-development-pr-lens
---

# Pr Lens {#pr-lens}

コードの変更を、動く構成図・データフロー図の SVG として描きます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/software-development/pr-lens` で導入します |
| パス | `optional-skills/software-development/pr-lens` |
| バージョン | `1.0.0` |
| 作者 | Coldtea AI (adapted by Nous Research) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `diagrams`, `pull-requests`, `code-review`, `svg` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# PR Lens Skill {#pr-lens-skill}

PR Lens は、コードを見栄えのするアニメーション図として描きます。差分、構成、データの流れです。差分やコードベースを 1 つの JSON ドキュメント（レーン、ノード、エッジ、順序つきのフロー）として記述すると、CLI がそれをアニメーションつきの SVG に描き出します。指摘を出すレンズはありません。PR Lens は理解を助ける層であって、レビュー bot ではないからです。バグ、リスク、セキュリティの注記を書くフィールドはなく、そうしたものを勝手に作ったドキュメントは弾かれます。

## こんなときに使います {#when-to-use}

- コードの変更やシステムを、図にする・見える形にする・説明するよう頼まれたとき。
- プルリクエストに構成図やデータフロー図を載せたいとき。
- キーワード: PR Lens、図、構成、データフロー、可視化、プルリクエスト。

## 事前に必要なもの {#prerequisites}

- `npx` の使える Node.js（CLI は `npx @coldtea/pr-lens-cli@latest` で動くので、インストールの手順はありません）。
- `gh`（GitHub CLI）— 任意です。図を PR に添付するときだけ使います。
- 任意のキャンバス公開では、外部のサービス prlens.dev を呼び出します（手順 4b を参照）。

## 実行のしかた {#how-to-run}

コマンドはすべて、ターミナルツールでリポジトリのルートから実行します。

1. **差分を読みます。** コードの変更を表すときは `git diff --find-renames <base>...<head>` です。base はマージベースで、base ブランチの先端ではありません。差分を表すのでなければ、図にしたいコードを読みます。

2. **ドキュメントを書きます。** `references/graph-document.md` に従って `.pr-lens/graph.json` に書き出します。`references/example.graph.json` は正しい見本で、3 つのレーン、4 つの変化状態すべて、主役のエッジ、7 ステップのフロー、入れ子の掘り下げツリー、6 ステップの解説がそろっています。最初のドキュメントを書く前に読んでください。仕様書を読むより早く飲み込めます。

3. **検証して直します。**

   ```bash
   npx @coldtea/pr-lens-cli@latest validate .pr-lens/graph.json
   ```

   失敗はすべて直し、もう一度実行します。検証に通らないドキュメントは描画しません。失敗で名指しされた要素を消して失敗を「回避」することもしません。

4. **描画します。**

   ```bash
   npx @coldtea/pr-lens-cli@latest render .pr-lens/graph.json --theme light
   ```

   ユーザーが別のテーマを求めない限り、ライトで描画します。SVG、マニフェスト、`drawn.graph.json` は `.pr-lens/` に出力され、CLI がこのフォルダをリポジトリの .gitignore に加えます。どれもコミットしないでください。これらは必要なときに差分から作り直すものです。各 SVG の名前は、ビュー、テーマ、内容のハッシュからつけられます。`manifest.json` には、それらがレンズとビューごとに並んでいます。

4b. **キャンバスへの push — 任意で、明示的に選んだときだけです。** ユーザーが共有用のリンクをはっきり求めたときに限ります。これは `.pr-lens/drawn.graph.json` を外部のサービス prlens.dev に公開します。

   ```bash
   npx @coldtea/pr-lens-cli@latest canvas push
   ```

   リンクが 3 つ表示されます。ユーザーに渡すのは**閲覧リンク**（`https://prlens.dev/c/{id}`）です。図を全画面で表示し、すべてのビューが 1 ページにまとまっていて、ログインは要りません。**編集リンク**（末尾が `#w=…`）を持っている人はキャンバスを上書きできます。これは秘密情報です。求められない限り返信に含めず、公開の場には決して貼らないでください。埋め込みリンクは、いちばん上のビューを README 用の SVG として配信します。同じファイルをもう一度 push すると同じキャンバスが更新されるので、「そのノードの名前を変えて」と頼まれたら、編集、検証、描画、push の順で進めればリンクは変わりません。push に失敗したら、そう伝え、ローカルの SVG の場所と、どれがいちばん上のビューかをユーザーに教えます。

5. **PR があれば添付します。** 上流のドキュメントには `gh pr create/edit/comment --attach <path>` と書かれていますが、`--attach` が入ったのは GitHub CLI 2.99 です。まず `gh --version` を確かめてください（たとえば gh 2.97 には**ありません**）。gh 2.99 以上なら、本文に Markdown の画像 `![alt](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/software-development/pr-lens/.pr-lens/<view>.svg)` を書き（HTML の `<img>` は書いたまま残り、代わりにファイルが末尾に追加されます。alt テキストは、画像が表示されない読み手に届く 1 行の説明です）、参照する図ごとに `--attach <path>` を繰り返します。

   ```bash
   gh pr create --title "…" --body-file .pr-lens/body.md --attach .pr-lens/overview-light-<hash>.svg
   ```

   `--attach` がなければ、コミットを伴わない方法を使います。
   - SVG を gist にアップロードします: `gh gist create .pr-lens/<view>.svg`。そのうえで gist の raw URL を PR の本文やコメントから参照します。または
   - キャンバスのリンクで公開し（手順 4b。ユーザーの同意が必要です）、閲覧 URL をリンクします。または
   - レビュアーが作り直せるよう、ローカルの `.pr-lens/` のパスを PR の本文に書いておきます。

   どこか消えない場所に公開できたら、コメント用の Markdown は CLI に組み立てさせます。

   ```bash
   npx @coldtea/pr-lens-cli@latest comment \
     --graph .pr-lens/drawn.graph.json \
     --manifest .pr-lens/manifest.json \
     --asset-base-url <where you published the SVGs>
   ```

   `--graph` に渡すのは `drawn.graph.json` で、自分で書いたドキュメントではありません。マニフェストが記述していないドキュメントを CLI は受け付けません。`--asset-base-url` を省くと、Markdown は誰も取得できないローカルのパスを指してしまいます。Markdown は標準出力に出るので、それを投稿するのはあなたの役目です。

   添付するのはレビュアーに必要なビューだけにし、残りは `.pr-lens/` に置いておきます。まずいちばん上の構成図、続いて、変更に追う価値のある流れがあればデータフロー図です。図は 4 枚より 2 枚のほうがたいてい伝わります。

6. **任意の自動化:** `npx @coldtea/pr-lens-cli@latest analyze --base <ref>` は、自分の API キーでプロバイダー（Gemini、OpenAI、または任意の `/chat/completions` エンドポイント）に問い合わせて、手順 1〜2 を代わりに行います。ここでキーが要るのはこの経路だけです。ふだんはドキュメントを自分で書きます。

## 読む価値のあるドキュメントにするには {#what-makes-a-document-worth-reading}

- **変わっていないものも入れます。** 変更が触れる、変わっていない隣のものが文脈になります。`delta: "unchanged"` と印をつけます。
- **レーンは読み手の頭の中の見取り図です**（ランタイム、層、境界）。フォルダの構成ではありません。
- **主役のエッジは 1 本**、多くても 2 本にします。その変更が本当に扱っているつながりです。
- **フローは、アニメーションで見せる価値のある順序があるときだけ足します。** よいフロー 1 つは、薄いフロー 3 つに勝ります。
- **ファイル参照をつけます。** それがレビュアーのクリックするパーマリンクになります。
- 構成図のビューは C4 に着想を得た判断のツリーです。システムコンテキスト → コンテナ → コンポーネントの順に、子は実質的に狭くなっていきます。中身のない階層や繰り返しになる階層は飛ばし、データフロー図のビューは別の根として分け、いちばん役に立つ上位の構成図ビューに `defaultOpen: true` を設定します。
- **解説**（2〜12 ステップ、目安は 3〜7）: 自明でない変更には必ず書きます。1 ステップ = 1 つの変更（追加／削除／移動）で、主要な変更を最初に、全体像を最後に置きます。見出しは 48 文字以内で、変更を表す言葉で組み立てます。本文は 140 文字以内で、ふるまいについて書き、省略はできません。賢い 12 歳に向けて書き、"leverages" や "orchestrates" のような言葉は使いません。続くステップは同じ段に置きます。解説のフィールドには CLI 0.4.0 以上（contract 0.1.1）が必要です。
- **間違った地図を直すとき:** 生成されたドキュメントは決して編集せず、修正を `.github/pr-lens.yml` に書き（`references/config.md` を参照）、`npx @coldtea/pr-lens-cli@latest validate .github/pr-lens.yml` で検証します。`id:` での一致より、パスの glob を優先します。

## 早見表 {#quick-reference}

| コマンド | 目的 |
| --- | --- |
| `npx @coldtea/pr-lens-cli@latest validate .pr-lens/graph.json` | ドキュメントを検証する（`.github/pr-lens.yml` も検証します） |
| `npx @coldtea/pr-lens-cli@latest render .pr-lens/graph.json --theme light` | SVG とマニフェストを `.pr-lens/` に描き出す |
| `npx @coldtea/pr-lens-cli@latest canvas push` | 任意: prlens.dev に公開する（明示的に選んだときだけ） |
| `npx @coldtea/pr-lens-cli@latest comment --graph … --manifest … --asset-base-url …` | PR コメント用の Markdown を組み立てて標準出力に出す |
| `npx @coldtea/pr-lens-cli@latest analyze --base <ref>` | LLM プロバイダー経由でドキュメントを自動で書く（API キーが必要） |

検証が失敗したときのコード:

| コード | やってしまったこと |
| --- | --- |
| `BROKEN_REFERENCE` | エッジ、フローのステップ、ビュー、解説のステップが、宣言していない id を指している |
| `INVALID_DOCUMENT` | 存在しないフィールドを作った。スキーマは厳格で、知らないキーは弾かれる |
| `DUPLICATE_ID` | 2 つのノード、エッジ、ビューが同じ id を使っている |
| `UNSUPPORTED_SCHEMA_VERSION` | `schemaVersion` がインストールされている contract のバージョンと違う |

## つまずきやすいところ {#pitfalls}

- 6 つの規則は JSON Schema になく、パーサーだけが確かめます（参照の整合性、逆向きの行範囲、食い違う `self` の端点、同一のパッチコミット、マニフェストに対して多すぎるビュー、間違った段に向いたフローステップの焦点）。構造化出力だけでは足りないので、必ず `validate` を実行してください。
- `.pr-lens/` の中身は何もコミットしないでください。作り直されるもので、CLI が gitignore に加えます。
- gh の `--attach` フラグには gh 2.99 以上が必要です。古い gh には何も言わずに存在しないので、それを前提に本文を書く前に確かめてください。
- キャンバスの編集リンク（`#w=…`）は書き込み用の認証情報です。求められずに共有したり、公開の場に貼ったりしないでください。
- 保存された地図には解説が入りません。解説は 1 つの変更の物語を語るものです。
- `pr-lens render` は、`.github/pr-lens.yml` の修正のうち何にも一致しなかったものを報告します。エラーではなく、直す価値のあるずれです。

## 確認 {#verification}

スモークテスト（2026-09-12 に npx 経由の `@coldtea/pr-lens-cli`、Linux の node で実際に確認済み）:

```bash
cp references/example.graph.json /tmp/prlens-smoke/ && cd /tmp/prlens-smoke
npx -y @coldtea/pr-lens-cli@latest validate example.graph.json
# ✓ example.graph.json — graph document · 3 lanes, 10 nodes, 13 edges, 1 flow · 6 walkthrough steps
npx -y @coldtea/pr-lens-cli@latest render example.graph.json --theme light
# ✓ .pr-lens/manifest.json — 4 SVGs across 4 diagrams
```

どちらも終了コード 0 で終わり、`.pr-lens/` に `*-light-<hash>.svg` のファイルが 4 つと、`manifest.json`、`drawn.graph.json` ができていれば成功です。

---

[coldteadotai/pr-lens](https://github.com/coldteadotai/pr-lens)（packages/agent-skill、0993b4d に固定）をもとにしています。MIT License、Copyright (c) 2026 Coldtea AI。LICENSE.txt を参照してください。
