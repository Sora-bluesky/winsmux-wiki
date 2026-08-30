---
title: "Touchdesigner Mcp — twozero MCP 経由で TouchDesigner を操作する"
description: "twozero MCP 経由で TouchDesigner を操作する"
upstream_path: user-guide/skills/optional/creative/creative-touchdesigner-mcp.md
upstream_blob: befee1c288a4b26c57d50be596047871f2a2cbe9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-touchdesigner-mcp
---

# Touchdesigner Mcp {#touchdesigner-mcp}

twozero MCP 経由で TouchDesigner を操作します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/creative/touchdesigner-mcp` で導入します |
| パス | `optional-skills/creative\touchdesigner-mcp` |
| バージョン | `1.1.0` |
| 作者 | kshitijk4poor |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `TouchDesigner`, `MCP`, `twozero`, `creative-coding`, `real-time-visuals`, `generative-art`, `audio-reactive`, `VJ`, `installation`, `GLSL` |
| 関連 skill | [`ascii-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-ascii-video/), [`manim-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-manim-video/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# TouchDesigner との連携（twozero MCP） {#touchdesigner-integration-twozero-mcp}

## 絶対に守るルール {#critical-rules}

1. **パラメータ名を推測しないでください。** まず対象の op の型について `td_get_par_info` を呼びます。学習データの内容は TD 2025.32 では通用しません。
2. **`tdAttributeError` が出たら、そこで止めてください。** 先に進む前に、失敗したノードに対して `td_get_operator_info` を呼びます。
3. **スクリプトのコールバックに絶対パスを直接書かないでください。** `me.parent()` や `scriptOp.parent()` を使います。
4. **td_execute_python よりネイティブの MCP ツールを優先してください。** `td_create_operator`、`td_set_operator_pars`、`td_get_errors` などを使います。`td_execute_python` に頼るのは、複数の手順が絡む込み入った処理のときだけにします。
5. **組み立てを始める前に `td_get_hints` を呼びます。** 扱おうとしている op の型に合わせたパターンが返ってきます。

## 構成 {#architecture}

```
Hermes Agent -> MCP (Streamable HTTP) -> twozero.tox (port 40404) -> TD Python
```

ネイティブのツールは 36 個あります。プラグインは無料です（支払いもライセンスも不要。2026 年 4 月に確認）。
文脈を把握していて、選択中の OP や今のネットワークがわかります。
ハブの生存確認: `GET http://localhost:40404/mcp` を叩くと、インスタンスの PID・プロジェクト名・TD のバージョンを含む JSON が返ります。

## セットアップ（自動） {#setup-automated}

セットアップ用のスクリプトを実行すれば、ひととおり済みます。

```bash
bash "${HERMES_HOME:-$HOME/.hermes}/skills/creative/touchdesigner-mcp/scripts/setup.sh"
```

スクリプトは次のことをします。
1. TD が起動しているか確認する
2. twozero.tox がまだ手元になければダウンロードする
3. Hermes の設定に `twozero_td` MCP サーバーを追加する（未登録のとき）
4. ポート 40404 で MCP の接続を試す
5. 手作業で残る手順を知らせる（.tox を TD にドラッグする、MCP のトグルを有効にする）

### 手作業の手順（一度だけ・自動化できません） {#manual-steps-one-time-cannot-be-automated}

1. **`~/Downloads/twozero.tox` を TD のネットワークエディタにドラッグする** → Install をクリック
2. **MCP を有効にする:** twozero のアイコンをクリック → Settings → mcp → "auto start MCP" → Yes
3. **Hermes のセッションを再起動する**。これで新しい MCP サーバーが読み込まれます

セットアップが終わったら確認します。
```bash
nc -z 127.0.0.1 40404 && echo "twozero MCP: READY"
```

## 環境についての補足 {#environment-notes}

- **非商用版の TD** は解像度が 1280×1280 までに制限されます。`outputresolution = 'custom'` にして、幅と高さを明示的に指定します。
- **コーデック:** `prores`（macOS ではこちらが向いています）か、代わりに `mjpa` を使います。H.264 / H.265 / AV1 は商用ライセンスが必要です。
- パラメータを設定する前に必ず `td_get_par_info` を呼びます。名前は TD のバージョンによって変わります（「絶対に守るルール」の 1 番を参照）。

## 進め方 {#workflow}

### ステップ 0: 下調べ（何かを組み立てる前に） {#step-0-discover-before-building-anything}

```
Call td_get_par_info with op_type for each type you plan to use.
Call td_get_hints with the topic you're building (e.g. "glsl", "audio reactive", "feedback").
Call td_get_focus to see where the user is and what's selected.
Call td_get_network to see what already exists.
```

一時的なノードも後片付けも要りません。以前のような下調べの手間は、これで完全に置き換わります。

### ステップ 1: 片付けてから組み立てる {#step-1-clean-build}

**重要: 片付けと作成は別々の MCP 呼び出しに分けてください。** 同じ名前のノードを 1 つの `td_execute_python` スクリプトの中で消して作り直すと、"Invalid OP object" エラーになります。落とし穴の 11b を参照してください。

ノードごとに `td_create_operator` を使います（ビューポート上の配置は自動で決まります）。

```
td_create_operator(type="noiseTOP", parent="/project1", name="bg", parameters={"resolutionw": 1280, "resolutionh": 720})
td_create_operator(type="levelTOP", parent="/project1", name="brightness")
td_create_operator(type="nullTOP", parent="/project1", name="out")
```

まとめて作ったり結線したりするときは `td_execute_python` を使います。

```python
# td_execute_python script:
root = op('/project1')
nodes = []
for name, optype in [('bg', noiseTOP), ('fx', levelTOP), ('out', nullTOP)]:
    n = root.create(optype, name)
    nodes.append(n.path)
# Wire chain
for i in range(len(nodes)-1):
    op(nodes[i]).outputConnectors[0].connect(op(nodes[i+1]).inputConnectors[0])
result = {'created': nodes}
```

### ステップ 2: パラメータを設定する {#step-2-set-parameters}

ネイティブのツールを優先します（値を検証してくれるので、落ちません）。

```
td_set_operator_pars(path="/project1/bg", parameters={"roughness": 0.6, "monochrome": true})
```

式やモードを扱うときは `td_execute_python` を使います。

```python
op('/project1/time_driver').par.colorr.expr = "absTime.seconds % 1000.0"
```

### ステップ 3: 結線する {#step-3-wire}

`td_execute_python` を使います。結線用のネイティブツールはありません。

```python
op('/project1/bg').outputConnectors[0].connect(op('/project1/fx').inputConnectors[0])
```

### ステップ 4: 確認する {#step-4-verify}

```
td_get_errors(path="/project1", recursive=true)
td_get_perf()
td_get_operator_info(path="/project1/out", detail="full")
```

### ステップ 5: 表示・キャプチャ {#step-5-display-capture}

```
td_get_screenshot(path="/project1/out")
```

スクリプトからウィンドウを開くこともできます。

```python
win = op('/project1').create(windowCOMP, 'display')
win.par.winop = op('/project1/out').path
win.par.winw = 1280; win.par.winh = 720
win.par.winopen.pulse()
```

## MCP ツール早見表 {#mcp-tool-quick-reference}

**中心になるもの（いちばんよく使います）:**
| ツール | 内容 |
|------|------|
| `td_execute_python` | TD の中で任意の Python を実行します。API に全部アクセスできます。 |
| `td_create_operator` | パラメータ付きでノードを作り、位置も自動で決めます |
| `td_set_operator_pars` | パラメータを安全に設定します（検証するので落ちません） |
| `td_get_operator_info` | ノード 1 つを調べます。接続・パラメータ・エラー |
| `td_get_operators_info` | 複数のノードを 1 回の呼び出しで調べます |
| `td_get_network` | あるパスのネットワーク構造を見ます |
| `td_get_errors` | エラーや警告を再帰的に探します |
| `td_get_par_info` | OP の型ごとにパラメータ名を取得します（下調べの代わり） |
| `td_get_hints` | 組み立てる前にパターンやコツを取得します |
| `td_get_focus` | どのネットワークが開いていて、何が選択されているか |

**読み書き:**
| ツール | 内容 |
|------|------|
| `td_read_dat` | DAT のテキストを読みます |
| `td_write_dat` | DAT の内容を書き込む・部分的に直す |
| `td_read_chop` | CHOP のチャンネル値を読みます |
| `td_read_textport` | TD のコンソール出力を読みます |

**見た目:**
| ツール | 内容 |
|------|------|
| `td_get_screenshot` | OP のビューアを 1 つファイルに保存します |
| `td_get_screenshots` | 複数の OP を一度に保存します |
| `td_get_screen_screenshot` | TD 経由で実際の画面を撮ります |
| `td_navigate_to` | ネットワークエディタを目的の OP に移動します |

**検索:**
| ツール | 内容 |
|------|------|
| `td_find_op` | プロジェクト全体から名前や型で op を探します |
| `td_search` | コード・式・文字列パラメータを検索します |

**システム:**
| ツール | 内容 |
|------|------|
| `td_get_perf` | 性能を計測します（FPS、遅い op） |
| `td_list_instances` | 起動中の TD インスタンスを一覧します |
| `td_get_docs` | TD のあるテーマについて詳しい説明を取得します |
| `td_agents_md` | COMP ごとの markdown ドキュメントを読み書きします |
| `td_reinit_extension` | コードを編集したあとに拡張を読み直します |
| `td_clear_textport` | デバッグを始める前にコンソールを消します |

**入力の自動化:**
| ツール | 内容 |
|------|------|
| `td_input_execute` | TD にマウスやキーボードの入力を送ります |
| `td_input_status` | 入力キューの状態を見ます |
| `td_input_clear` | 入力の自動化を止めます |
| `td_op_screen_rect` | ノードの画面上の座標を取得します |
| `td_click_screen_point` | スクリーンショット上の点をクリックします |
| `td_screen_point_to_global` | スクリーンショットのピクセルを画面の絶対座標に変換します |

上の表は、ふだんの制作で使う 32 個のツールを網羅しています。残る 4 つ（`td_project_quit`、`td_test_session`、`td_dev_log`、`td_clear_dev_log`）は管理用・開発モード用です。36 個すべてとパラメータの詳しい定義は `references/mcp-tools.md` を見てください。

## 実装で押さえるところ {#key-implementation-rules}

**GLSL の時間:** GLSL TOP に `uTDCurrentTime` はありません。Values ページを使います。
```python
# Call td_get_par_info(op_type="glslTOP") first to confirm param names
td_set_operator_pars(path="/project1/shader", parameters={"value0name": "uTime"})
# Then set expression via script:
# op('/project1/shader').par.value0.expr = "absTime.seconds"
# In GLSL: uniform float uTime;
```

代わりの手: `rgba32float` 形式の Constant TOP を使います（8 bit だと 0〜1 に丸められて、シェーダーが止まって見えます）。

**Feedback TOP:** 入力を直接つなぐのではなく、`top` パラメータで参照します。"Not enough sources" は最初のクックが終われば消えます。"Cook dependency loop" の警告は出て当然のものです。

**解像度:** 非商用版は 1280×1280 までです。`outputresolution = 'custom'` を使います。

**大きなシェーダー:** GLSL を `/tmp/file.glsl` に書き出してから、`td_write_dat` か `td_execute_python` で読み込みます。

**頂点・点へのアクセス（TD 2025.32）:** `point.P[0]`、`point.P[1]`、`point.P[2]` を使います。`.x`、`.y`、`.z` ではありません。

**拡張:** CONSTANT モードでの `ext0object` の書式は `"op('./datName').module.ClassName(me)"` です。`td_write_dat` で拡張のコードを編集したら、`td_reinit_extension` を呼びます。

**スクリプトのコールバック:** 必ず `me.parent()` や `scriptOp.parent()` で相対パスを使います。

**ノードを片付けるとき:** 繰り返し処理の前に必ず `list(root.children)` にして、`child.valid` も確認します。

## 録画・書き出し {#recording-exporting-video}

```python
# via td_execute_python:
root = op('/project1')
rec = root.create(moviefileoutTOP, 'recorder')
op('/project1/out').outputConnectors[0].connect(rec.inputConnectors[0])
rec.par.type = 'movie'
rec.par.file = '/tmp/output.mov'
rec.par.videocodec = 'prores'  # Apple ProRes — NOT license-restricted on macOS
rec.par.record = True   # start
# rec.par.record = False  # stop (call separately later)
```

H.264 / H.265 / AV1 には商用ライセンスが要ります。macOS では `prores` を、それが使えなければ `mjpa` を使います。
フレームを取り出す: `ffmpeg -i /tmp/output.mov -vframes 120 /tmp/frames/frame_%06d.png`

**アニメーションに TOP.save() は使えません。** 毎回まったく同じ GPU テクスチャを撮ってしまいます。必ず MovieFileOut を使ってください。

### 録画の前に: チェックリスト {#before-recording-checklist}

1. **FPS が 0 より大きいことを `td_get_perf` で確かめます。** FPS が 0 だと録画は空になります。落とし穴の 38〜39 を参照してください。
2. **シェーダーの出力が真っ黒でないことを `td_get_screenshot` で確かめます。** 真っ黒なら、シェーダーのエラーか入力がつながっていません。落とし穴の 8 と 40 を参照してください。
3. **音も録るとき:** 先に音を鳴らしはじめて、録画は 3 フレーム遅らせます。落とし穴の 19 を参照してください。
4. **録画を始める前に出力先のパスを設定します。** 同じスクリプトで両方を設定すると、順番が競合することがあります。

## 音に反応する GLSL（実績のある手順） {#audio-reactive-glsl-proven-recipe}

### 正しい信号のつなぎ方（2026 年 4 月に検証） {#correct-signal-chain-tested-april-2026}

```
AudioFileIn CHOP (playmode=sequential)
  → AudioSpectrum CHOP (FFT=512, outputmenu=setmanually, outlength=256, timeslice=ON)
  → Math CHOP (gain=10)
  → CHOP to TOP (dataformat=r, layout=rowscropped)
  → GLSL TOP input 1 (spectrum texture, 256x2)

Constant TOP (rgba32float, time) → GLSL TOP input 0
GLSL TOP → Null TOP → MovieFileOut
```

### 音に反応させるときの要点（実験で確認済み） {#critical-audio-reactive-rules-empirically-verified}

1. **AudioSpectrum の TimeSlice は ON のままにします。** OFF にすると音声ファイル全体を処理してしまい、24000 を超えるサンプルが CHOP to TOP からあふれます。
2. **Output Length は手動で 256 にします。** `outputmenu='setmanually'` と `outlength=256` を指定します。既定では 22050 サンプル出ます。
3. **スペクトルをなめらかにするのに Lag CHOP を使わないでください。** Lag CHOP は timeslice モードで動くため、256 サンプルを 2400 以上に広げ、すべての値をならしてほぼゼロ（1e-06 程度）にしてしまいます。シェーダーには使えるデータが届きません。検証中、音との同期が崩れる原因としてこれが最も多く出ました。
4. **Filter CHOP も使わないでください。** スペクトルのデータでは同じ timeslice の膨張が起きます。
5. **なめらかにする処理は GLSL のシェーダー側でやります。** 必要なら、フィードバックのテクスチャを使った時間方向の補間で行います: `mix(prevValue, newValue, 0.3)`。これならフレーム単位でぴったり同期し、途中で遅れも生まれません。
6. **CHOP to TOP の dataformat は 'r'**、layout は 'rowscropped' です。スペクトルの出力は 256x2（ステレオ）です。最初のチャンネルは y=0.25 で読み取ります。
7. **Math の gain は 10** です（5 ではありません）。生のスペクトル値は低音域で 0.19 くらいなので、10 倍するとシェーダーで扱いやすい 5.0 前後になります。
8. **Resample CHOP は要りません。** 出力サイズは AudioSpectrum の `outlength` パラメータで直接決めます。

### GLSL でのスペクトルの読み取り {#glsl-spectrum-sampling}

```glsl
// Input 0 = time (1x1 rgba32float), Input 1 = spectrum (256x2)
float iTime = texture(sTD2DInputs[0], vec2(0.5)).r;

// Sample multiple points per band and average for stability:
// NOTE: y=0.25 for first channel (stereo texture is 256x2, first row center is 0.25)
float bass = (texture(sTD2DInputs[1], vec2(0.02, 0.25)).r +
              texture(sTD2DInputs[1], vec2(0.05, 0.25)).r) / 2.0;
float mid  = (texture(sTD2DInputs[1], vec2(0.2, 0.25)).r +
              texture(sTD2DInputs[1], vec2(0.35, 0.25)).r) / 2.0;
float hi   = (texture(sTD2DInputs[1], vec2(0.6, 0.25)).r +
              texture(sTD2DInputs[1], vec2(0.8, 0.25)).r) / 2.0;
```

組み立てるスクリプトとシェーダーのコードの全文は `references/network-patterns.md` にあります。

## オペレータ早見表 {#operator-quick-reference}

| 系統 | 色 | Python のクラス / MCP の型 | 接尾辞 |
|--------|-------|-------------|--------|
| TOP | 紫 | noiseTOP, glslTOP, compositeTOP, levelTop, blurTOP, textTOP, nullTOP | TOP |
| CHOP | 緑 | audiofileinCHOP, audiospectrumCHOP, mathCHOP, lfoCHOP, constantCHOP | CHOP |
| SOP | 青 | gridSOP, sphereSOP, transformSOP, noiseSOP | SOP |
| DAT | 白 | textDAT, tableDAT, scriptDAT, webserverDAT | DAT |
| MAT | 黄 | phongMAT, pbrMAT, glslMAT, constMAT | MAT |
| COMP | 灰 | geometryCOMP, containerCOMP, cameraCOMP, lightCOMP, windowCOMP | COMP |

## セキュリティについての補足 {#security-notes}

- MCP は localhost だけで動きます（ポート 40404）。認証はないので、同じ端末のどのプロセスからでもコマンドを送れます。
- `td_execute_python` は、TD のプロセスの権限で TD の Python 環境とファイルシステムに制限なくアクセスできます。
- `setup.sh` は公式の 404zero.com の URL から twozero.tox をダウンロードします。気になるならダウンロードしたものを検証してください。
- この skill が localhost の外にデータを送ることはありません。MCP のやり取りはすべてローカルで完結します。

## 参考資料 {#references}

| ファイル | 内容 |
|------|------|
| `references/pitfalls.md` | 実際のセッションで痛い目を見て得た知見 |
| `references/operators.md` | すべてのオペレータ系統と、そのパラメータや使いどころ |
| `references/network-patterns.md` | 作り方の型: 音に反応するもの、生成的なもの、GLSL、インスタンシング |
| `references/mcp-tools.md` | twozero MCP のツールのパラメータ定義の全文 |
| `references/python-api.md` | TD の Python: op()、スクリプト、拡張 |
| `references/troubleshooting.md` | 接続の診断、デバッグ |
| `references/glsl.md` | GLSL のユニフォーム、組み込み関数、シェーダーの雛形 |
| `references/postfx.md` | ポストエフェクト: ブルーム、CRT、色収差、フィードバックの発光 |
| `references/layout-compositor.md` | HUD のレイアウト、パネルの格子、BSP 風のレイアウト |
| `references/operator-tips.md` | ワイヤーフレーム描画、Feedback TOP の組み方 |
| `references/geometry-comp.md` | Geometry COMP: インスタンシング、POP と SOP の違い、モーフィング |
| `references/audio-reactive.md` | 音の帯域の取り出し、ビート検出、エンベロープ追従 |
| `references/animation.md` | LFO、タイマー、キーフレーム、イージング、式で動かす |
| `references/midi-osc.md` | MIDI / OSC のコントローラ、TouchOSC、複数の端末での同期 |
| `references/particles.md` | POP と従来の particleSOP — 放出、力、衝突 |
| `references/projection-mapping.md` | 複数ウィンドウ出力、コーナーピン、メッシュワープ、エッジブレンド |
| `references/external-data.md` | HTTP、WebSocket、MQTT、シリアル、TCP、webserverDAT |
| `references/panel-ui.md` | カスタムパラメータ、パネル COMP、ボタン / スライダー / 入力欄、panelExecuteDAT |
| `references/replicator.md` | replicatorCOMP — データに沿った複製、レイアウト、コールバック |
| `references/dat-scripting.md` | Execute DAT の仲間 — chop / dat / parameter / panel / op / executeDAT |
| `references/3d-scene.md` | 照明の組み方、影、IBL / キューブマップ、複数カメラ、PBR |
| `scripts/setup.sh` | 自動セットアップのスクリプト |

---

> あなたが書いているのはコードではありません。光を指揮しているのです。
