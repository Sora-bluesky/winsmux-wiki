---
title: "Ascii Video — ASCII 動画: 動画や音声を色付き ASCII の MP4/GIF に変換します"
description: "ASCII 動画: 動画や音声を色付き ASCII の MP4/GIF に変換します"
upstream_path: user-guide/skills/bundled/creative/creative-ascii-video.md
upstream_blob: 73eb134110af274c92f1c86bea7c6e012a0c4dcd
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-ascii-video
---

# Ascii Video {#ascii-video}

ASCII 動画: 動画や音声を色付き ASCII の MP4/GIF に変換します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/ascii-video` |
| バージョン | `1.0.0` |
| 作者 | SHL0MS, Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `ASCII`, `Video`, `FFmpeg`, `Terminal-Art` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# ASCII 動画の制作パイプライン {#ascii-video-production-pipeline}

## 使いどころ {#when-to-use}

次のような依頼を受けたときに使います。ASCII 動画、文字アートの動画、ターミナル風の動画、文字アートのアニメーション、レトロなテキスト表現、ASCII のオーディオビジュアライザー、動画を ASCII アートに変換、マトリックス風の演出、そのほかアニメーションする ASCII 出力全般です。

## 中身 {#whats-inside}

ASCII アート動画をどんな形式でも作れる制作パイプラインです。動画・音声・画像・生成的な入力を、色付き ASCII 文字の動画出力（MP4、GIF、連番画像）に変換します。扱う範囲は、動画から ASCII への変換、音に反応する音楽ビジュアライザー、生成的な ASCII アートアニメーション、動画と音声を組み合わせたハイブリッド、テキストや歌詞のオーバーレイ、ターミナル上でのリアルタイム描画です。

## 制作の基準 {#creative-standard}

これは視覚芸術です。ASCII 文字は画材にすぎず、目指す水準は映画です。

**コードを一行でも書く前に**、作品のコンセプトを言葉にしてください。どんな気分を届けるのか。どんな視覚的な物語を語るのか。ほかのあらゆる ASCII 動画と違って、この作品を際立たせるものは何か。ユーザーのプロンプトは出発点です。そのまま文字どおりに写し取るのではなく、野心を持って解釈してください。

**一発目のレンダリングで完成度を出すことは譲れません。** 何度も直しを重ねなくても、目を引く出来である必要があります。ありきたりだったり、平板だったり、「AI が作った ASCII アート」に見えたりしたら、それは失敗です。仕上げる前にコンセプトから練り直してください。

**参照ファイルの語彙を超えていってください。** references にある効果のカタログ、シェーダーのプリセット、パレット集は、あくまで出発点の語彙です。案件ごとに組み合わせ、手を加え、新しいパターンを生み出してください。カタログは絵の具のパレットであり、絵を描くのはあなたです。

**先回りして工夫してください。** その作品に必要なら、skill の語彙そのものを拡張してかまいません。references に、思い描いたものを実現する手段がなければ自分で作ります。頼まれてはいないけれど喜ばれる視覚的な見せ場を、最低ひとつは入れてください。トランジション、エフェクト、色の選択など、作品全体を引き上げるものです。

**技術的な正しさより、まとまりのある美意識を優先します。** 動画のすべてのシーンが、ひとつの視覚言語でつながっている必要があります。色温度をそろえる、文字パレットに関連を持たせる、動きの語彙を一貫させる、といったことです。シーンごとにばらばらの効果を使った動画は、技術的に正しくても美的には失敗です。

**密度があり、層をなし、考え抜かれていること。** どのフレームも見る価値があるようにします。背景を真っ黒のままにしない。かならず複数グリッドで構成する。かならずシーンごとに変化をつける。かならず意図を持って色を選ぶ。

## モード {#modes}

| モード | 入力 | 出力 | 参照 |
|------|-------|--------|-----------|
| **Video-to-ASCII** | 動画ファイル | 元映像を ASCII で再現したもの | `references/inputs.md` § Video Sampling |
| **Audio-reactive** | 音声ファイル | 音の特徴で駆動する生成的なビジュアル | `references/inputs.md` § Audio Analysis |
| **Generative** | なし（またはシード値） | 手続き的な ASCII アニメーション | `references/effects.md` |
| **Hybrid** | 動画 + 音声 | 音に反応するオーバーレイ付きの ASCII 動画 | 入力に関する参照の両方 |
| **Lyrics/text** | 音声 + テキスト/SRT | 効果付きでタイミングを合わせたテキスト | `references/inputs.md` § Text/Lyrics |
| **TTS narration** | 引用テキスト + TTS API | タイプ表示されるテキストとナレーション付きの証言・引用動画 | `references/inputs.md` § TTS Integration |

## 構成技術 {#stack}

案件ごとに、単体で完結する Python スクリプトを 1 本作ります。GPU は不要です。

| 層 | ツール | 役割 |
|-------|------|---------|
| Core | Python 3.10+, NumPy | 数値計算、配列操作、ベクトル化した効果 |
| Signal | SciPy | FFT、ピーク検出（音声を使うモード） |
| Imaging | Pillow (PIL) | フォントのラスタライズ、フレームのデコード、画像の入出力 |
| Video I/O | ffmpeg (CLI) | 入力のデコード、出力のエンコード、音声の多重化 |
| Parallel | concurrent.futures | 一括処理やクリップ描画を N 個のワーカーで並列化 |
| TTS | ElevenLabs API (任意) | ナレーション音声の生成 |
| Optional | OpenCV | 動画フレームの抽出、エッジ検出 |

## パイプラインの構造 {#pipeline-architecture}

どのモードも、同じ 6 段階のパイプラインをたどります。

```
INPUT → ANALYZE → SCENE_FN → TONEMAP → SHADE → ENCODE
```

1. **INPUT** — 素材を読み込んでデコードします（動画フレーム、音声サンプル、画像、あるいは入力なし）
2. **ANALYZE** — フレームごとの特徴量を取り出します（音声の帯域、映像の輝度やエッジ、動きベクトル）
3. **SCENE_FN** — シーン関数がピクセルキャンバス（`uint8 H,W,3`）に描画します。`_render_vf()` とピクセルのブレンドモードで複数の文字グリッドを合成します。`references/composition.md` を参照してください
4. **TONEMAP** — パーセンタイルに基づく適応的な明るさの正規化です。`references/composition.md` § Adaptive Tonemap を参照してください
5. **SHADE** — `ShaderChain` と `FeedbackBuffer` による後処理です。`references/shaders.md` を参照してください
6. **ENCODE** — 生の RGB フレームを ffmpeg に流し込み、H.264 や GIF にエンコードします

## 表現の方向づけ {#creative-direction}

### 美的な軸 {#aesthetic-dimensions}

| 軸 | 選択肢 | 参照 |
|-----------|---------|-----------|
| **文字パレット** | 濃度ランプ、ブロック要素、記号、文字体系（カタカナ、ギリシャ文字、ルーン、点字）、作品専用のもの | `architecture.md` § Palettes |
| **色の方針** | HSV、OKLAB/OKLCH、離散的な RGB パレット、自動生成した調和配色、モノクロ、色温度 | `architecture.md` § Color System |
| **背景のテクスチャ** | サイン波の場、fBM ノイズ、ドメインワープ、ボロノイ、反応拡散、セルオートマトン、動画 | `effects.md` |
| **主要な効果** | リング、螺旋、トンネル、渦、波、干渉、オーロラ、炎、SDF、ストレンジアトラクタ | `effects.md` |
| **パーティクル** | 火花、雪、雨、泡、ルーン、軌道、群れ（boids）、フローフィールド追従、軌跡 | `effects.md` § Particles |
| **シェーダーの気分** | レトロ CRT、清潔でモダン、グリッチアート、シネマティック、夢見心地、インダストリアル、サイケデリック | `shaders.md` |
| **グリッドの密度** | xs(8px) から xxl(40px) まで、層ごとに混在させる | `architecture.md` § Grid System |
| **座標系** | 直交、極、タイル、回転、魚眼、メビウス、ドメインワープ | `effects.md` § Transforms |
| **フィードバック** | ズームトンネル、虹色の軌跡、幽玄な残像、回転する曼荼羅、色の変化 | `composition.md` § Feedback |
| **マスク** | 円、リング、グラデーション、文字型の抜き、アニメーションするアイリス/ワイプ/ディゾルブ | `composition.md` § Masking |
| **トランジション** | クロスフェード、ワイプ、ディゾルブ、グリッチカット、アイリス、マスクによる出現 | `shaders.md` § Transitions |

### セクションごとの変化 {#per-section-variation}

動画全体で同じ設定を使い回さないでください。セクションやシーンごとに、次を変えます。
- **背景の効果を変える**（あるいは 2〜3 個を組み合わせる）
- **文字パレットを変える**（気分に合わせる）
- **色の方針を変える**（最低でも色相を変える）
- **シェーダーの強さに緩急をつける**（盛り上がりではブルームを強く、静かな場面ではグレインを強く）
- パーティクルを使っているなら**種類を変える**

### 作品ごとの発明 {#project-specific-invention}

案件ごとに、次のうち最低ひとつは自分で考え出してください。
- テーマに合わせた独自の文字パレット
- 独自の背景効果（既存の部品を組み合わせたり改造したりする）
- 独自の配色（ブランドや気分に合う離散的な RGB の組）
- 独自のパーティクル用文字セット
- 目新しいシーン転換や視覚的な見せ場

カタログから選ぶだけで済ませないでください。カタログは語彙であり、詩を書くのはあなたです。

## 進め方 {#workflow}

### ステップ 1: 作品の構想 {#step-1-creative-vision}

コードを書く前に、コンセプトを言葉にします。

- **気分・雰囲気**: 見る人に何を感じてほしいのか。躍動、瞑想、混沌、優雅、不穏？
- **視覚的な物語**: 尺のあいだに何が起きるのか。緊張を高めるのか。変容するのか。溶けていくのか？
- **色の世界**: 暖色か寒色か。モノクロか。ネオンか。アースカラーか。主となる色相は？
- **文字の質感**: 濃密なデータか。まばらな星か。有機的な点か。幾何学的なブロックか？
- **この作品ならではのもの**: この案件を唯一無二にする一点は何か？
- **感情の起伏**: シーンはどう進むのか。勢いよく始まり、クライマックスへ高まり、収束するのか？

ユーザーのプロンプトを、美的な選択へ変換してください。「まったりした lo-fi のビジュアライザー」と「グリッチなサイバーパンクのデータストリーム」では、あらゆる要素が変わります。

### ステップ 2: 技術的な設計 {#step-2-technical-design}

- **モード** — 上の 6 モードのどれにするか
- **解像度** — 横長 1920x1080（既定）、縦長 1080x1920、正方形 1080x1080、24fps
- **ハードウェアの検出** — コア数と RAM を自動判定し、品質プロファイルを決めます。`references/optimization.md` を参照してください
- **セクション** — 時刻とシーン関数を対応づけ、それぞれに効果・パレット・色・シェーダーの設定を持たせます
- **出力形式** — MP4（既定）、GIF（640x360、15fps）、PNG 連番

### ステップ 3: スクリプトを作る {#step-3-build-the-script}

Python ファイル 1 本にまとめます。構成要素と参照先は次のとおりです。

1. **ハードウェア検出と品質プロファイル** — `references/optimization.md`
2. **入力ローダー** — モードによって変わります。`references/inputs.md`
3. **特徴量の解析** — 音声の FFT、映像の輝度、または合成的な生成
4. **グリッドとレンダラー** — ビットマップをキャッシュした多密度グリッド。`references/architecture.md`
5. **文字パレット** — 案件ごとに複数用意します。`references/architecture.md` § Palettes
6. **色のしくみ** — HSV + 離散 RGB + 調和配色の生成。`references/architecture.md` § Color
7. **シーン関数** — それぞれ `canvas (uint8 H,W,3)` を返します。`references/scenes.md`
8. **トーンマップ** — 適応的な明るさの正規化。`references/composition.md`
9. **シェーダーのパイプライン** — `ShaderChain` と `FeedbackBuffer`。`references/shaders.md`
10. **シーン表とディスパッチャ** — 時刻からシーン関数と設定を引きます。`references/scenes.md`
11. **並列エンコーダー** — ffmpeg のパイプを使い、N 個のワーカーでクリップを描画します
12. **メイン** — パイプライン全体を組み立てます

### ステップ 4: 品質の確認 {#step-4-quality-verification}

- **まずテストフレーム**: 全体を描画する前に、要所の時刻で 1 フレームずつ描画して確かめます
- **明るさの確認**: ASCII の内容すべてで `canvas.mean() > 8` になるようにします。暗ければガンマを下げます
- **視覚的な一貫性**: すべてのシーンが同じ動画のものだと感じられますか
- **構想との照合**: 出力はステップ 1 のコンセプトに合っていますか。ありきたりに見えるなら戻ってやり直します

## 実装上の重要な注意 {#critical-implementation-notes}

### 明るさ — 線形の倍率ではなく `tonemap()` を使う {#brightness-use-tonemap-not-linear-multipliers}

これが視覚面での一番の問題です。黒地の ASCII はもともと暗くなります。**`canvas * N` の倍率は使わないでください** — 明部が白飛びします。代わりに適応的なトーンマップを使います。

```python
def tonemap(canvas, gamma=0.75):
    f = canvas.astype(np.float32)
    lo, hi = np.percentile(f[::4, ::4], [1, 99.5])
    if hi - lo < 10: hi = lo + 10
    f = np.clip((f - lo) / (hi - lo), 0, 1) ** gamma
    return (f * 255).astype(np.uint8)
```

パイプラインは `scene_fn() → tonemap() → FeedbackBuffer → ShaderChain → ffmpeg` の順です。

シーンごとのガンマは、既定 0.75、ソラリゼーション 0.55、ポスタリゼーション 0.50、明るいシーン 0.85 です。暗い層には `overlay` ではなく `screen` ブレンドを使ってください。

### フォントのセル高 {#font-cell-height}

macOS の Pillow では `textbbox()` が誤った高さを返します。`font.getmetrics()` を使い、`cell_height = ascent + descent` としてください。`references/troubleshooting.md` を参照してください。

### ffmpeg のパイプでのデッドロック {#ffmpeg-pipe-deadlock}

長時間動く ffmpeg に `stderr=subprocess.PIPE` を使ってはいけません。バッファが 64KB で埋まり、デッドロックします。ファイルへリダイレクトしてください。`references/troubleshooting.md` を参照してください。

### フォントの対応状況 {#font-compatibility}

すべての Unicode 文字が、すべてのフォントで描画できるわけではありません。初期化時にパレットを検証し、1 文字ずつ描画して空になっていないか確認してください。`references/troubleshooting.md` を参照してください。

### クリップ単位の構造 {#per-clip-architecture}

区切りのある動画（引用、シーン、章立て）では、それぞれを別のクリップファイルとして描画します。並列で描画でき、一部だけ描き直せます。`references/scenes.md` を参照してください。

## 性能の目安 {#performance-targets}

| 構成要素 | 目安 |
|-----------|--------|
| 特徴量の抽出 | 1-5ms |
| 効果の関数 | 2-15ms |
| 文字の描画 | 80-150ms（ここが律速） |
| シェーダーのパイプライン | 5-25ms |
| **合計** | 1 フレームあたり約 100-200ms |

## 参照ファイル {#references}

| ファイル | 内容 |
|------|----------|
| `references/architecture.md` | グリッドのしくみ、解像度のプリセット、フォントの選択、文字パレット（20 種類以上）、色のしくみ（HSV + OKLAB + 離散 RGB + 調和配色の生成）、`_render_vf()` ヘルパー、GridLayer クラス |
| `references/composition.md` | ピクセルのブレンドモード（20 種類）、`blend_canvas()`、複数グリッドの合成、適応的な `tonemap()`、`FeedbackBuffer`、`PixelBlendStack`、マスクと抜き型のしくみ |
| `references/effects.md` | 効果の部品: 値の場の生成、色相の場、ノイズ/fBM/ドメインワープ、ボロノイ、反応拡散、セルオートマトン、SDF、ストレンジアトラクタ、パーティクル、座標変換、時間方向の一貫性 |
| `references/shaders.md` | `ShaderChain`、`_apply_shader_step()` の振り分け、38 種類のシェーダーカタログ、音に反応するスケーリング、トランジション、色味のプリセット、出力形式のエンコード、ターミナル描画 |
| `references/scenes.md` | シーンの取り決め、`Renderer` クラス、`SCENES` 表、`render_clip()`、拍に合わせたカット、並列描画、設計パターン（層の階層、方向を持つ弧、視覚的な比喩、構図の技法）、あらゆる複雑さのシーン実例、シーン設計のチェックリスト |
| `references/inputs.md` | 音声の解析（FFT、帯域、ビート）、動画のサンプリング、画像の変換、テキストや歌詞、TTS の連携（ElevenLabs、声の割り当て、音声のミックス） |
| `references/optimization.md` | ハードウェアの検出、品質プロファイル、ベクトル化のパターン、並列描画、メモリ管理、性能の目安 |
| `references/troubleshooting.md` | NumPy のブロードキャストの落とし穴、ブレンドモードの罠、マルチプロセスと pickle、明るさの診断、ffmpeg の問題、フォントの問題、よくある間違い |

---

## 表現の逸脱（実験的・独創的・唯一無二の出力を求められたときだけ使う） {#creative-divergence-use-only-when-user-requests-experimentalcreativeunique-output}

創造的、実験的、意外性のある、型破りな出力を求められたら、いちばん合う戦略を選び、コードを書く前にその手順を頭の中でたどってください。

- **Forced Connections** — 分野をまたいだ発想が欲しいとき（「有機的に見せて」「インダストリアルな雰囲気で」）
- **Conceptual Blending** — 組み合わせるものを 2 つ挙げられたとき（「海と音楽」「宇宙 + 書道」）
- **Oblique Strategies** — 制約が最小のとき（「驚かせて」「見たことのないものを」）

### Forced Connections {#forced-connections}
1. 目指す映像とは無関係な分野を選びます（気象、微生物学、建築、流体力学、織物）
2. その分野の視覚的・構造的な要素を挙げます（浸食 → 少しずつ現れる、細胞分裂 → 分かれて複製される、織り → 組み合う模様）
3. その要素を ASCII 文字とアニメーションのパターンに対応づけます
4. 統合します — 「浸食」や「結晶化」は、文字グリッドの上でどう見えるでしょうか

### Conceptual Blending {#conceptual-blending}
1. 別々の視覚的・概念的な空間を 2 つ挙げます（例: 海の波 + 楽譜）
2. 対応関係を作ります（波の頂点 = 高音、谷 = 休符、泡 = スタッカート）
3. 選びながら混ぜます — おもしろい対応だけ残し、こじつけは捨てます
4. 混ざったときにだけ現れる性質を育てます

### Oblique Strategies {#oblique-strategies}
1. 1 枚引きます: 「間違いを隠れた意図として尊重せよ」「古いアイデアを使え」「親友ならどうする？」「欠点を強調せよ」「逆さまにせよ」「全部ではなく一部だけ」「反転せよ」
2. その指示を、いま取り組んでいる ASCII アニメーションの課題に当てはめて解釈します
3. その横滑りした発想を、コードを書く前に映像の設計へ反映します
