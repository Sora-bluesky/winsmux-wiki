---
title: "Concept Diagrams — フラットで最小限の教材向け SVG を HTML として作る"
description: "フラットで最小限の教材向け SVG を HTML として作る"
upstream_path: user-guide/skills/optional/creative/creative-concept-diagrams.md
upstream_blob: 09ac135f4ae369651cbf3d2eedcf223e215ba629
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-concept-diagrams
---

# Concept Diagrams {#concept-diagrams}

フラットで最小限の教材向け SVG を HTML として作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/concept-diagrams` で入れます |
| パス | `optional-skills/creative/concept-diagrams` |
| バージョン | `0.1.0` |
| 作者 | v1k22（もとの PR）、hermes-agent へ移植 |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `diagrams`, `svg`, `visualization`, `education`, `physics`, `chemistry`, `engineering` |
| 関連 skill | [`architecture-diagram`](/hermes/docs/user-guide/skills/bundled/creative/creative-architecture-diagram/), [`excalidraw`](/hermes/docs/user-guide/skills/bundled/creative/creative-excalidraw/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Concept Diagrams {#concept-diagrams}

フラットで最小限の統一デザインで、そのまま使える品質の SVG 図を作ります。出力は単体で完結する HTML ファイル 1 つで、最近のブラウザならどれでも同じように表示され、ライトモードとダークモードは自動で切り替わります。

## 向き不向き {#scope}

**得意なもの:**
- 物理の実験装置、化学の反応機構、数学の曲線、生物
- 実在するもの（航空機、風力タービン、スマートフォン、機械式時計、細胞）
- 解剖図、断面図、レイヤーを分解した図
- 間取り図、リフォーム前後の図
- 物語形式の流れ（○○の一生、○○の工程）
- ハブとスポーク型のシステム連携（スマートシティ、IoT ネットワーク、送電網）
- 分野を問わない教材・教科書ふうの図
- 数値のグラフ（グループ化した棒グラフ、エネルギー図）

**先に別の手段を探したほうがよいもの:**
- 暗めの技術系デザインで描くソフトウェア／クラウド基盤の構成図（使えるなら `architecture-diagram` を検討してください）
- 手描きのホワイトボード風スケッチ（使えるなら `excalidraw` を検討してください）
- アニメーション解説や動画の出力（アニメーション系の skill を検討してください）

その題材により適した skill があるなら、そちらを優先してください。どれも合わない場合は、汎用の SVG 図として本 skill を使えます。出力は以下で説明する落ち着いた教材ふうの見た目になり、たいていの題材にとって無難な選択肢になります。

## 進め方 {#workflow}

1. 図の種類を決めます（後述の「図の種類」を参照）。
2. デザインルールに従って要素を配置します。
3. `templates/template.html` を外枠として使い、HTML ページ全文を書きます。テンプレートの `<!-- PASTE SVG HERE -->` の位置に SVG を貼り込みます。
4. 単体で完結する `.html` ファイルとして保存します（たとえば `~/my-diagram.html` や `./my-diagram.html`）。
5. 利用者はそれをブラウザで直接開くだけです。サーバーも追加のインストールも要りません。

任意: 複数の図を一覧して見たいと言われた場合は、末尾の「ローカルのプレビューサーバー」を参照してください。

HTML テンプレートを読み込みます:
```
skill_view(name="concept-diagrams", file_path="templates/template.html")
```

テンプレートにはデザイン一式の CSS（`c-*` の色クラス、文字クラス、ライト／ダークの変数、矢印マーカーの指定）が埋め込まれています。生成する SVG は、これらのクラスが表示側のページにあることを前提としています。

---

## デザインの決まり {#design-system}

### 考え方 {#philosophy}

- **フラット**: グラデーション、影、ぼかし、発光、ネオン風の効果は使いません。
- **最小限**: 必要なものだけを描きます。箱の中に飾りのアイコンは入れません。
- **一貫**: どの図でも色・余白・文字・線の太さをそろえます。
- **ダークモード対応**: 色はすべて CSS クラス経由で自動的に切り替わります。モードごとに SVG を作り分ける必要はありません。

### 配色 {#color-palette}

9 系統の色があり、それぞれ 7 段階の濃さを持ちます。クラス名は `<g>` か図形の要素に付けてください。両モードの処理はテンプレートの CSS が引き受けます。

| Class      | 50 (lightest) | 100     | 200     | 400     | 600     | 800     | 900 (darkest) |
|------------|---------------|---------|---------|---------|---------|---------|---------------|
| `c-purple` | #EEEDFE | #CECBF6 | #AFA9EC | #7F77DD | #534AB7 | #3C3489 | #26215C |
| `c-teal`   | #E1F5EE | #9FE1CB | #5DCAA5 | #1D9E75 | #0F6E56 | #085041 | #04342C |
| `c-coral`  | #FAECE7 | #F5C4B3 | #F0997B | #D85A30 | #993C1D | #712B13 | #4A1B0C |
| `c-pink`   | #FBEAF0 | #F4C0D1 | #ED93B1 | #D4537E | #993556 | #72243E | #4B1528 |
| `c-gray`   | #F1EFE8 | #D3D1C7 | #B4B2A9 | #888780 | #5F5E5A | #444441 | #2C2C2A |
| `c-blue`   | #E6F1FB | #B5D4F4 | #85B7EB | #378ADD | #185FA5 | #0C447C | #042C53 |
| `c-green`  | #EAF3DE | #C0DD97 | #97C459 | #639922 | #3B6D11 | #27500A | #173404 |
| `c-amber`  | #FAEEDA | #FAC775 | #EF9F27 | #BA7517 | #854F0B | #633806 | #412402 |
| `c-red`    | #FCEBEB | #F7C1C1 | #F09595 | #E24B4A | #A32D2D | #791F1F | #501313 |

#### 色の割り当て方 {#color-assignment-rules}

色は**意味**を表すもので、並び順を表すものではありません。虹のように順ぐりに色を変えてはいけません。

- **種類**ごとに要素をまとめます。同じ種類の要素は同じ色にします。
- 中立・構造的な要素（開始、終了、一般的な手順、利用者）には `c-gray` を使います。
- 1 つの図で使う色は **2〜3 色**にとどめます。6 色以上は使いません。
- 一般的な分類には `c-purple`、`c-teal`、`c-coral`、`c-pink` を優先します。
- `c-blue`、`c-green`、`c-amber`、`c-red` は意味を持たせる用途（情報、成功、警告、エラー）に取っておきます。

ライト／ダークでの段階の対応（テンプレートの CSS が処理するので、クラスを付けるだけで済みます）:
- ライトモード: 塗り 50 ＋ 線 600 ＋ 見出し 800 ／ 補足 600
- ダークモード: 塗り 800 ＋ 線 200 ＋ 見出し 100 ／ 補足 200

### 文字 {#typography}

文字サイズは 2 種類だけです。例外はありません。

| Class | Size | Weight | Use |
|-------|------|--------|-----|
| `th`  | 14px | 500    | 要素の見出し、領域のラベル |
| `ts`  | 12px | 400    | 補足、説明、矢印のラベル |
| `t`   | 14px | 400    | 一般の文字 |

- **英文は常に文頭だけ大文字にします。** 単語ごとの大文字始まりも、全部大文字も使いません。
- すべての `<text>` に必ずクラス（`t`、`ts`、`th`）を付けます。クラスなしの文字は禁止です。
- 箱の中の文字にはすべて `dominant-baseline="central"` を付けます。
- 箱の中央に置く文字には `text-anchor="middle"` を付けます。

**幅の見積もり（おおよそ）:**
- 14px の weight 500: 1 文字あたり約 8px
- 12px の weight 400: 1 文字あたり約 6.5px
- 必ず確かめます: `box_width >= (char_count × px_per_char) + 48`（左右それぞれ 24px の余白）

### 余白と配置 {#spacing-layout}

- **ViewBox**: `viewBox="0 0 680 H"`。H は中身の高さ ＋ 40px の余裕です。
- **安全な領域**: x=40 から x=640、y=40 から y=(H-40) まで。
- **箱と箱のあいだ**: 最低 60px あけます。
- **箱の内側**: 左右 24px、上下 12px の余白をとります。
- **矢印の先端**: 箱の縁とのあいだを 10px あけます。
- **1 行の箱**: 高さ 44px。
- **2 行の箱**: 高さ 56px、見出しと補足のベースライン間は 18px。
- **入れ物の余白**: どの入れ物でも内側に最低 20px とります。
- **入れ子の深さ**: 2〜3 段まで。それより深いと幅 680px では読めなくなります。

### 線と形 {#stroke-shape}

- **線の太さ**: すべての要素の枠線は 0.5px。1px でも 2px でもありません。
- **角丸**: 要素は `rx="8"`、内側の入れ物は `rx="12"`、外側の入れ物は `rx="16"` から `rx="20"`。
- **つなぎ線のパス**: 必ず `fill="none"` を付けます。付けないと SVG の既定で `fill: black` になります。

### 矢印マーカー {#arrow-marker}

**すべての** SVG の先頭に、この `<defs>` ブロックを入れてください:

```xml
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke"
          stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
```

線には `marker-end="url(#arrow)"` を付けます。矢印の先端は `context-stroke` によって線の色を受け継ぎます。

### CSS クラス（テンプレートが用意しています） {#css-classes-provided-by-the-template}

テンプレートのページが用意しているものは次のとおりです:

- 文字: `.t`、`.ts`、`.th`
- 中立: `.box`、`.arr`、`.leader`、`.node`
- 色の系統: `.c-purple`、`.c-teal`、`.c-coral`、`.c-pink`、`.c-gray`、`.c-blue`、`.c-green`、`.c-amber`、`.c-red`（いずれもライト／ダークが自動で切り替わります）

これらを定義し直す必要は**ありません**。SVG の中で使うだけです。CSS の定義はテンプレートのファイルに入っています。

---

## SVG のひな形 {#svg-boilerplate}

テンプレートのページに入れる SVG は、必ずこの形で始めます:

```xml
<svg width="100%" viewBox="0 0 680 {HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <!-- Diagram content here -->

</svg>
```

`{HEIGHT}` は実際に計算した高さ（いちばん下の要素の下端 ＋ 40px）に置き換えます。

### 要素の書き方 {#node-patterns}

**1 行の要素（44px）:**
```xml
<g class="node c-blue">
  <rect x="100" y="20" width="180" height="44" rx="8" stroke-width="0.5"/>
  <text class="th" x="190" y="42" text-anchor="middle" dominant-baseline="central">Service name</text>
</g>
```

**2 行の要素（56px）:**
```xml
<g class="node c-teal">
  <rect x="100" y="20" width="200" height="56" rx="8" stroke-width="0.5"/>
  <text class="th" x="200" y="38" text-anchor="middle" dominant-baseline="central">Service name</text>
  <text class="ts" x="200" y="56" text-anchor="middle" dominant-baseline="central">Short description</text>
</g>
```

**つなぎ線（ラベルなし）:**
```xml
<line x1="200" y1="76" x2="200" y2="120" class="arr" marker-end="url(#arrow)"/>
```

**入れ物（破線でも実線でも）:**
```xml
<g class="c-purple">
  <rect x="40" y="92" width="600" height="300" rx="16" stroke-width="0.5"/>
  <text class="th" x="66" y="116">Container label</text>
  <text class="ts" x="66" y="134">Subtitle info</text>
</g>
```

---

## 図の種類 {#diagram-types}

題材に合う配置を選んでください:

1. **フローチャート** — CI/CD のパイプライン、リクエストの一生、承認の流れ、データ処理。流れは一方向（上から下、または左から右）にします。1 行あたり最大 4〜5 要素まで。
2. **構造・入れ子** — クラウド基盤の入れ子、階層のあるシステム構成。大きな外枠の中に内側の領域を置きます。論理的なまとまりには破線の四角を使います。
3. **API・エンドポイント図** — REST のルート、GraphQL のスキーマ。根から枝分かれしてリソースのまとまりへ、その中にエンドポイントの要素を置きます。
4. **マイクロサービスの構成** — サービスメッシュ、イベント駆動のシステム。サービスを要素として置き、やり取りを矢印で示し、あいだにメッセージキューを挟みます。
5. **データの流れ** — ETL のパイプライン、ストリーミングの構成。左から右へ、取得元から処理を経て格納先まで流します。
6. **実物・構造** — 乗り物、建物、ハードウェア、解剖。実物の形に合う図形を使います。曲面のある本体には `<path>`、先細りの形には `<polygon>`、円筒状の部品には `<ellipse>` や `<circle>`、区画には入れ子の `<rect>` を使います。`references/physical-shape-cookbook.md` を参照してください。
7. **インフラ・システム連携** — スマートシティ、IoT ネットワーク、複数分野にまたがるシステム。中央の基盤が各サブシステムをつなぐハブとスポーク型にします。線の種類で意味を示します（`.data-line`、`.power-line`、`.water-pipe`、`.road`）。`references/infrastructure-patterns.md` を参照してください。
8. **UI・ダッシュボードの模型** — 管理画面、監視ダッシュボード。画面の枠の中に、グラフやメーターや表示灯の要素を入れ子にします。`references/dashboard-patterns.md` を参照してください。

実物・インフラ・ダッシュボードの図を描くときは、作り始める前に対応する参考ファイルを読み込んでください。それぞれ、すぐ使える CSS クラスと図形の部品が用意されています。

---

## 確認リスト {#validation-checklist}

SVG を仕上げる前に、次の項目を**すべて**確かめてください:

1. すべての `<text>` に `t`、`ts`、`th` のいずれかのクラスが付いている。
2. 箱の中のすべての `<text>` に `dominant-baseline="central"` が付いている。
3. 矢印として使うすべてのつなぎ線の `<path>` や `<line>` に `fill="none"` が付いている。
4. 関係のない箱を突き抜ける矢印がない。
5. 14px の文字では `box_width >= (longest_label_chars × 8) + 48` を満たしている。
6. 12px の文字では `box_width >= (longest_label_chars × 6.5) + 48` を満たしている。
7. ViewBox の高さが、いちばん下の要素 ＋ 40px になっている。
8. 中身がすべて x=40 から x=640 の範囲に収まっている。
9. 色のクラス（`c-*`）が `<g>` か図形の要素に付いていて、つなぎ線の `<path>` には付いていない。
10. 矢印の `<defs>` ブロックがある。
11. グラデーション、影、ぼかし、発光の効果を使っていない。
12. すべての要素の枠線の太さが 0.5px になっている。

---

## 出力とプレビュー {#output-preview}

### 既定: 単体で完結する HTML ファイル {#default-standalone-html-file}

利用者がそのまま開ける `.html` ファイルを 1 つ書きます。サーバーも追加のインストールも不要で、オフラインでも動きます。書き方は次のとおりです:

```python
# 1. Load the template
template = skill_view("concept-diagrams", "templates/template.html")

# 2. Fill in title, subtitle, and paste your SVG
html = template.replace(
    "<!-- DIAGRAM TITLE HERE -->", "SN2 reaction mechanism"
).replace(
    "<!-- OPTIONAL SUBTITLE HERE -->", "Bimolecular nucleophilic substitution"
).replace(
    "<!-- PASTE SVG HERE -->", svg_content
)

# 3. Write to a user-chosen path (or ./ by default)
write_file("./sn2-mechanism.html", html)
```

開き方も伝えてください:

```
# macOS
open ./sn2-mechanism.html
# Linux
xdg-open ./sn2-mechanism.html
```

### 任意: ローカルのプレビューサーバー（複数の図の一覧） {#optional-local-preview-server-multi-diagram-gallery}

複数の図をまとめて見たいと利用者がはっきり求めたときだけ使ってください。

**決まりごと:**
- `127.0.0.1` にだけ待ち受けます。`0.0.0.0` は使いません。すべてのネットワーク接続先に図を見せてしまうのは、共有ネットワークでは危険です。
- 空いているポートを選びます（決め打ちにしないでください）。選んだ URL は利用者に伝えます。
- このサーバーはあくまで任意です。まずは単体で完結する HTML ファイルを勧めてください。

おすすめの書き方（空いているポートを OS に選ばせます）:

```bash
# Put each diagram in its own folder under .diagrams/
mkdir -p .diagrams/sn2-mechanism
# ...write .diagrams/sn2-mechanism/index.html...

# Serve on loopback only, free port
cd .diagrams && python3 -c "

with socketserver.TCPServer(('127.0.0.1', 0), http.server.SimpleHTTPRequestHandler) as s:
    print(f'Serving at http://127.0.0.1:{s.server_address[1]}/')
    s.serve_forever()
" &
```

ポートを固定したいと言われた場合は `127.0.0.1:<port>` の形にします。その場合も `0.0.0.0` は使いません。止め方（`kill %1` か `pkill -f "http.server"`）も書き添えてください。

---

## 例の一覧 {#examples-reference}

`examples/` ディレクトリには、動作を確認済みの完成した図が 15 個入っています。似た種類の図を新しく描く前に、ここで使える書き方を探してください:

| File | Type | Demonstrates |
|------|------|--------------|
| `hospital-emergency-department-flow.md` | フローチャート | 色で意味を示した優先度の振り分け |
| `feature-film-production-pipeline.md` | フローチャート | 段階に分けた流れ、横方向の枝分かれ |
| `automated-password-reset-flow.md` | フローチャート | エラー分岐を含む認証の流れ |
| `autonomous-llm-research-agent-flow.md` | フローチャート | 戻る矢印、判断による分岐 |
| `place-order-uml-sequence.md` | シーケンス | UML のシーケンス図ふうの描き方 |
| `commercial-aircraft-structure.md` | 実物 | 実物らしい形にするためのパス、多角形、楕円 |
| `wind-turbine-structure.md` | 実物の断面 | 地下と地上の描き分け、色分け |
| `smartphone-layer-anatomy.md` | 分解図 | 左右交互のラベル、重なった部品 |
| `apartment-floor-plan-conversion.md` | 間取り図 | 壁、扉、変更案を赤い点線で表示 |
| `banana-journey-tree-to-smoothie.md` | 物語形式の流れ | 曲がりくねった道筋、状態が少しずつ変わる様子 |
| `cpu-ooo-microarchitecture.md` | ハードウェアの処理段 | 枝分かれ、メモリ階層の側面図 |
| `sn2-reaction-mechanism.md` | 化学 | 分子、曲がった矢印、エネルギー図 |
| `smart-city-infrastructure.md` | ハブとスポーク | システムごとに線の種類を変える |
| `electricity-grid-flow.md` | 多段の流れ | 電圧の階層、流れを示すマーカー |
| `ml-benchmark-grouped-bar-chart.md` | グラフ | グループ化した棒グラフ、2 軸 |

例を読み込むには次のようにします:
```
skill_view(name="concept-diagrams", file_path="examples/<filename>")
```

---

## 早見表: どんなときに何を使うか {#quick-reference-what-to-use-when}

| User says | Diagram type | Suggested colors |
|-----------|--------------|------------------|
| 「パイプラインを見せて」 | フローチャート | 開始と終了は gray、手順は purple、エラーは red、デプロイは teal |
| 「データの流れを描いて」 | データのパイプライン（左から右） | 取得元は gray、処理は purple、格納先は teal |
| 「システムを図にして」 | 構造（入れ子） | 入れ物は purple、サービスは teal、データは coral |
| 「エンドポイントを整理して」 | API のツリー | 根は purple、リソースのまとまりごとに 1 系統 |
| 「サービスを見せて」 | マイクロサービスの構成 | 入口は gray、サービスは teal、バスは purple、ワーカーは coral |
| 「航空機・乗り物を描いて」 | 実物 | 実物らしい形にするためのパス、多角形、楕円 |
| 「スマートシティ・IoT」 | ハブとスポーク型の連携 | サブシステムごとに線の種類を変える |
| 「ダッシュボードを見せて」 | UI の模型 | 暗い画面、グラフの色は teal と purple、警告は coral |
| 「送電網・電力」 | 多段の流れ | 電圧の階層（高圧／中圧／低圧で線の太さを変える） |
| 「風力タービン・タービン」 | 実物の断面 | 基礎 ＋ 塔の切り欠き ＋ ナセルを色分け |
| 「○○の一生・ライフサイクル」 | 物語形式の流れ | 曲がりくねった道筋、状態が少しずつ変わる様子 |
| 「○○の層・分解図」 | 分解したレイヤー図 | 縦に積み、ラベルを左右交互に置く |
| 「CPU・パイプライン」 | ハードウェアの処理段 | 縦方向の段、実行ポートへの枝分かれ |
| 「間取り図・マンション」 | 間取り図 | 壁、扉、変更案を赤い点線で表示 |
| 「反応機構」 | 化学 | 原子、結合、曲がった矢印、遷移状態、エネルギー図 |
