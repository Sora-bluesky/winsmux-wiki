---
title: "Touchdesigner Mcp — twozero MCP 経由で TouchDesigner を操作する"
description: "twozero MCP 経由で TouchDesigner を操作する"
upstream_path: user-guide/skills/bundled/creative/creative-touchdesigner-mcp.md
upstream_blob: 8fff080b38368a8dfc7835ad3aba1cbe53899a9f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-touchdesigner-mcp
---

# Touchdesigner Mcp {#touchdesigner-mcp}

twozero MCP 経由で TouchDesigner を操作します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/touchdesigner-mcp` |
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

## 絶対に守ること {#critical-rules}

1. **パラメーター名を推測しないでください。** まず対象のオペレーター種別に対して `td_get_par_info` を呼びます。学習データの内容は TD 2025.32 では誤りです。
2. **`tdAttributeError` が出たら、そこで止まってください。** 先へ進む前に、失敗したノードに対して `td_get_operator_info` を呼びます。
3. **スクリプトのコールバックに絶対パスを直書きしないでください。** `me.parent()` / `scriptOp.parent()` を使います。
4. **td_execute_python より、専用の MCP ツールを優先してください。** `td_create_operator`、`td_set_operator_pars`、`td_get_errors` などを使い、複数手順にまたがる込み入った処理のときだけ `td_execute_python` に落とします。
5. **作り始める前に `td_get_hints` を呼んでください。** これから扱うオペレーター種別に固有のパターンが返ってきます。

## 構成 {#architecture}

```
Hermes Agent -> MCP (Streamable HTTP) -> twozero.tox (port 40404) -> TD Python
```

専用ツールは 36 個です。プラグインは無料です（支払いもライセンスも不要。2026 年 4 月に確認）。
選択中のオペレーターや現在のネットワークを把握したうえで動きます。
ハブの死活確認: `GET http://localhost:40404/mcp` を叩くと、インスタンスの PID、プロジェクト名、TD のバージョンが JSON で返ります。

## 導入（自動） {#setup-automated}

セットアップ用スクリプトを実行すれば、ひととおり済みます。

```bash
bash "${HERMES_HOME:-$HOME/.hermes}/skills/creative/touchdesigner-mcp/scripts/setup.sh"
```

スクリプトは次のことをします。
1. TD が起動しているか確認する
2. まだ手元にない場合は twozero.tox をダウンロードする
3. Hermes の設定に `twozero_td` の MCP サーバーを追加する（未登録の場合）
4. ポート 40404 で MCP の接続を試す
5. 手作業で残っている手順を伝える（.tox を TD にドラッグする、MCP のスイッチを入れる）

### 手作業の手順（初回のみ。自動化できません） {#manual-steps-one-time-cannot-be-automated}

1. **`~/Downloads/twozero.tox` を TD のネットワークエディターにドラッグします** → Install をクリックします
2. **MCP を有効にします:** twozero のアイコンをクリック → Settings → mcp → 「auto start MCP」→ Yes
3. **Hermes のセッションを再起動します。** これで新しい MCP サーバーが読み込まれます

導入後に確認します。
```bash
nc -z 127.0.0.1 40404 && echo "twozero MCP: READY"
```

## 動作環境について {#environment-notes}

- **非商用版の TD** は解像度が 1280×1280 までに制限されます。`outputresolution = 'custom'` にして、幅と高さを明示的に指定してください。
- **コーデック:** `prores`（macOS ではこちらが推奨）か、代替として `mjpa` を使います。H.264/H.265/AV1 には商用ライセンスが必要です。
- パラメーターを設定する前に必ず `td_get_par_info` を呼んでください。名前は TD のバージョンによって変わります（「絶対に守ること」の 1 番）。

## 作業の流れ {#workflow}

### 手順 0: 調べる（何かを作り始める前に） {#step-0-discover-before-building-anything}

```
Call td_get_par_info with op_type for each type you plan to use.
Call td_get_hints with the topic you're building (e.g. "glsl", "audio reactive", "feedback").
Call td_get_focus to see where the user is and what's selected.
Call td_get_network to see what already exists.
```

一時ノードも後片付けも要りません。以前の面倒な調査手順は、これで完全に置き換わります。

### 手順 1: 片付けてから作る {#step-1-clean-build}

**重要: 削除と作成は別々の MCP 呼び出しに分けてください。** 同じ名前のノードを 1 つの `td_execute_python` スクリプトのなかで壊して作り直すと、「Invalid OP object」エラーになります。落とし穴の 11b を参照してください。

ノードごとに `td_create_operator` を使います（ビューポート上の配置も自動でやってくれます）。

```
td_create_operator(type="noiseTOP", parent="/project1", name="bg", parameters={"resolutionw": 1280, "resolutionh": 720})
td_create_operator(type="levelTOP", parent="/project1", name="brightness")
td_create_operator(type="nullTOP", parent="/project1", name="out")
```

まとめて作ったり配線したりするときは `td_execute_python` を使います。

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

### 手順 2: パラメーターを設定する {#step-2-set-parameters}

専用ツールを優先してください（値を検証してくれるので、落ちません）。

```
td_set_operator_pars(path="/project1/bg", parameters={"roughness": 0.6, "monochrome": true})
```

式やモードを設定するときは `td_execute_python` を使います。

```python
op('/project1/time_driver').par.colorr.expr = "absTime.seconds % 1000.0"
```

### 手順 3: 配線する {#step-3-wire}

`td_execute_python` を使います。配線用の専用ツールはありません。

```python
op('/project1/bg').outputConnectors[0].connect(op('/project1/fx').inputConnectors[0])
```

### 手順 4: 確かめる {#step-4-verify}

```
td_get_errors(path="/project1", recursive=true)
td_get_perf()
td_get_operator_info(path="/project1/out", detail="full")
```

### 手順 5: 表示・書き出し {#step-5-display-capture}

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

**中心となるもの（これらを最もよく使います）:**
| ツール | 内容 |
|------|------|
| `td_execute_python` | TD で任意の Python を実行します。API に全面的にアクセスできます。 |
| `td_create_operator` | パラメーター付きでノードを作り、配置も自動で決めます |
| `td_set_operator_pars` | パラメーターを安全に設定します（検証するので落ちません） |
| `td_get_operator_info` | ノード 1 個を調べます: 接続、パラメーター、エラー |
| `td_get_operators_info` | 1 回の呼び出しで複数ノードを調べます |
| `td_get_network` | 指定したパスのネットワーク構造を見ます |
| `td_get_errors` | エラーと警告を再帰的に探します |
| `td_get_par_info` | オペレーター種別のパラメーター名を取得します（調査手順の代わりになります） |
| `td_get_hints` | 作り始める前にパターンとコツを取得します |
| `td_get_focus` | どのネットワークが開いていて、何が選ばれているか |

**読み書き:**
| ツール | 内容 |
|------|------|
| `td_read_dat` | DAT のテキスト内容を読みます |
| `td_write_dat` | DAT の内容を書き込む・部分的に直す |
| `td_read_chop` | CHOP のチャンネル値を読みます |
| `td_read_textport` | TD のコンソール出力を読みます |

**見た目:**
| ツール | 内容 |
|------|------|
| `td_get_screenshot` | オペレーター 1 個のビューアーをファイルに保存します |
| `td_get_screenshots` | 複数のオペレーターを一度に保存します |
| `td_get_screen_screenshot` | TD 経由で画面そのものを撮ります |
| `td_navigate_to` | ネットワークエディターを指定オペレーターまで移動します |

**検索:**
| ツール | 内容 |
|------|------|
| `td_find_op` | プロジェクト全体から名前や種別でオペレーターを探します |
| `td_search` | コード、式、文字列パラメーターを検索します |

**システム:**
| ツール | 内容 |
|------|------|
| `td_get_perf` | 性能を計測します（FPS、遅いオペレーター） |
| `td_list_instances` | 起動中の TD インスタンスを一覧表示します |
| `td_get_docs` | TD のあるテーマについて詳しい説明を出します |
| `td_agents_md` | COMP ごとの Markdown ドキュメントを読み書きします |
| `td_reinit_extension` | コードを直したあとに拡張を読み込み直します |
| `td_clear_textport` | デバッグを始める前にコンソールを消します |

**入力の自動操作:**
| ツール | 内容 |
|------|------|
| `td_input_execute` | TD にマウスやキーボードの操作を送ります |
| `td_input_status` | 入力キューの状態を確認します |
| `td_input_clear` | 入力の自動操作を止めます |
| `td_op_screen_rect` | ノードの画面座標を取得します |
| `td_click_screen_point` | スクリーンショット上の位置をクリックします |
| `td_screen_point_to_global` | スクリーンショットのピクセルを画面の絶対座標に変換します |

上の表は、ふだんの制作でよく使う 32 個のツールを載せています。残る 4 個（`td_project_quit`、`td_test_session`、`td_dev_log`、`td_clear_dev_log`）は管理・開発向けのものです。36 個すべてと引数の詳しい定義は `references/mcp-tools.md` を見てください。

## 実装で押さえるところ {#key-implementation-rules}

**GLSL の時間:** GLSL TOP に `uTDCurrentTime` はありません。Values ページを使います。
```python
# Call td_get_par_info(op_type="glslTOP") first to confirm param names
td_set_operator_pars(path="/project1/shader", parameters={"value0name": "uTime"})
# Then set expression via script:
# op('/project1/shader').par.value0.expr = "absTime.seconds"
# In GLSL: uniform float uTime;
```

代替手段: `rgba32float` 形式の Constant TOP を使います（8 ビットだと 0〜1 に丸められ、シェーダーが止まって見えます）。

**Feedback TOP:** 入力を直接つなぐのではなく、`top` パラメーターで参照します。「Not enough sources」は最初のクックで解消します。「Cook dependency loop」の警告は出て当たり前です。

**解像度:** 非商用版は 1280×1280 が上限です。`outputresolution = 'custom'` を使ってください。

**大きなシェーダー:** GLSL を `/tmp/file.glsl` に書き出し、`td_write_dat` か `td_execute_python` で読み込ませます。

**頂点・点へのアクセス（TD 2025.32）:** `point.P[0]`、`point.P[1]`、`point.P[2]` です。`.x`、`.y`、`.z` ではありません。

**拡張:** CONSTANT モードでの `ext0object` の書式は `"op('./datName').module.ClassName(me)"` です。`td_write_dat` で拡張のコードを直したら `td_reinit_extension` を呼んでください。

**スクリプトのコールバック:** 必ず `me.parent()` / `scriptOp.parent()` を使った相対パスにします。

**ノードの片付け:** 必ず `list(root.children)` にしてから回し、`child.valid` の確認も入れます。

## 録画・動画の書き出し {#recording-exporting-video}

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

H.264/H.265/AV1 には商用ライセンスが必要です。macOS では `prores` を、だめなら `mjpa` を使ってください。
フレームを取り出す: `ffmpeg -i /tmp/output.mov -vframes 120 /tmp/frames/frame_%06d.png`

**TOP.save() はアニメーションには使えません。** 毎回同じ GPU テクスチャーを取ってしまいます。必ず MovieFileOut を使ってください。

### 録画する前の確認事項 {#before-recording-checklist}

1. **FPS が 0 より大きいことを `td_get_perf` で確認します。** FPS が 0 だと録画結果は空になります。落とし穴の 38〜39 を参照してください。
2. **シェーダーの出力が真っ黒でないことを `td_get_screenshot` で確認します。** 真っ黒ならシェーダーのエラーか、入力が来ていません。落とし穴の 8 と 40 を参照してください。
3. **音声も録るなら:** 先に音声を頭出しして再生を始め、録画は 3 フレーム遅らせます。落とし穴の 19 を参照してください。
4. **録画を始める前に出力先のパスを設定します。** 同じスクリプトで両方を設定すると競合することがあります。

## 音に反応する GLSL（実績のある手順） {#audio-reactive-glsl-proven-recipe}

### 正しい信号の流れ（2026 年 4 月に検証） {#correct-signal-chain-tested-april-2026}

```
AudioFileIn CHOP (playmode=sequential)
  → AudioSpectrum CHOP (FFT=512, outputmenu=setmanually, outlength=256, timeslice=ON)
  → Math CHOP (gain=10)
  → CHOP to TOP (dataformat=r, layout=rowscropped)
  → GLSL TOP input 1 (spectrum texture, 256x2)

Constant TOP (rgba32float, time) → GLSL TOP input 0
GLSL TOP → Null TOP → MovieFileOut
```

### 音に反応させるときの要点（実際に確かめたもの） {#critical-audio-reactive-rules-empirically-verified}

1. **AudioSpectrum の TimeSlice は ON のままにします。** OFF にすると音声ファイル全体を処理し、24000 サンプル超になって CHOP to TOP があふれます。
2. **Output Length は手動で 256 にします。** `outputmenu='setmanually'` と `outlength=256` を指定してください。既定では 22050 サンプル出ます。
3. **スペクトラムの平滑化に Lag CHOP を使わないでください。** Lag CHOP はタイムスライスモードで動き、256 サンプルを 2400 超に引き伸ばして、値をほぼゼロ（1e-06 程度）にならしてしまいます。シェーダーには使える値が届きません。検証中、音との同期が失敗する原因の第 1 位でした。
4. **Filter CHOP も使わないでください。** スペクトラムのデータでは同じくタイムスライスによる引き伸ばしが起きます。
5. **平滑化が必要なら GLSL シェーダー側でやります。** フィードバックテクスチャーを使った時間方向の補間、つまり `mix(prevValue, newValue, 0.3)` です。これならパイプラインの遅れがゼロで、フレーム単位でぴったり合います。
6. **CHOP to TOP の dataformat は 'r'**、layout は 'rowscropped' にします。スペクトラムの出力は 256x2（ステレオ）です。最初のチャンネルは y=0.25 でサンプリングします。
7. **Math の gain は 10 です**（5 ではありません）。低音域のスペクトラムの生の値は 0.19 程度です。gain を 10 にすると、シェーダーで使える 5.0 程度になります。
8. **Resample CHOP は要りません。** 出力サイズは AudioSpectrum の `outlength` パラメーターで直接決めてください。

### GLSL でのスペクトラムのサンプリング {#glsl-spectrum-sampling}

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

組み立て用のスクリプトとシェーダーのコードは `references/network-patterns.md` にまとまっています。

## オペレーター早見表 {#operator-quick-reference}

| 系統 | 色 | Python のクラス／MCP の型 | 接尾辞 |
|--------|-------|-------------|--------|
| TOP | 紫 | noiseTOP, glslTOP, compositeTOP, levelTop, blurTOP, textTOP, nullTOP | TOP |
| CHOP | 緑 | audiofileinCHOP, audiospectrumCHOP, mathCHOP, lfoCHOP, constantCHOP | CHOP |
| SOP | 青 | gridSOP, sphereSOP, transformSOP, noiseSOP | SOP |
| DAT | 白 | textDAT, tableDAT, scriptDAT, webserverDAT | DAT |
| MAT | 黄 | phongMAT, pbrMAT, glslMAT, constMAT | MAT |
| COMP | 灰 | geometryCOMP, containerCOMP, cameraCOMP, lightCOMP, windowCOMP | COMP |

## セキュリティについて {#security-notes}

- MCP は localhost だけで動きます（ポート 40404）。認証はないので、同じ端末上のプロセスならどれでもコマンドを送れます。
- `td_execute_python` は、TD を動かしているユーザーの権限で、TD の Python 環境とファイルシステムに制限なくアクセスできます。
- `setup.sh` は公式の 404zero.com の URL から twozero.tox をダウンロードします。気になる場合はダウンロードしたものを検証してください。
- この skill が localhost の外へデータを送ることはありません。MCP のやり取りはすべて端末内で完結します。

## 参考資料 {#references}

| ファイル | 内容 |
|------|------|
| `references/pitfalls.md` | 実際の作業で身にしみた教訓 |
| `references/operators.md` | オペレーターの全系統。パラメーターと使いどころ |
| `references/network-patterns.md` | 作例集: 音に反応するもの、生成的なもの、GLSL、インスタンシング |
| `references/mcp-tools.md` | twozero MCP の全ツールの引数定義 |
| `references/python-api.md` | TD の Python: op()、スクリプト、拡張 |
| `references/troubleshooting.md` | 接続の診断とデバッグ |
| `references/glsl.md` | GLSL のユニフォーム、組み込み関数、シェーダーのひな形 |
| `references/postfx.md` | ポストエフェクト: ブルーム、CRT、色収差、フィードバックの光 |
| `references/layout-compositor.md` | HUD のレイアウト、パネルのグリッド、BSP 風のレイアウト |
| `references/operator-tips.md` | ワイヤーフレーム表示、Feedback TOP の組み方 |
| `references/geometry-comp.md` | Geometry COMP: インスタンシング、POP と SOP、モーフィング |
| `references/audio-reactive.md` | 音の帯域の抽出、ビート検出、エンベロープ追従 |
| `references/animation.md` | LFO、タイマー、キーフレーム、イージング、式で動かす |
| `references/midi-osc.md` | MIDI/OSC のコントローラー、TouchOSC、複数の端末の同期 |
| `references/particles.md` | POP と従来の particleSOP — 放出、力、衝突 |
| `references/projection-mapping.md` | 複数ウィンドウ出力、コーナーピン、メッシュワープ、エッジブレンド |
| `references/external-data.md` | HTTP、WebSocket、MQTT、シリアル、TCP、webserverDAT |
| `references/panel-ui.md` | カスタムパラメーター、パネル COMP、ボタン／スライダー／入力欄、panelExecuteDAT |
| `references/replicator.md` | replicatorCOMP — データから複製する、レイアウト、コールバック |
| `references/dat-scripting.md` | Execute DAT の系統 — chop/dat/parameter/panel/op/executeDAT |
| `references/3d-scene.md` | ライティング、影、IBL／キューブマップ、複数カメラ、PBR |
| `scripts/setup.sh` | 自動セットアップ用のスクリプト |

---

> 書いているのはコードではありません。光を指揮しているのです。
