---
title: "Neuroskill Bci — NeuroSkill から認知状態と気分のデータをそのまま受け取る"
description: "NeuroSkill から認知状態と気分のデータをそのまま受け取る"
upstream_path: user-guide/skills/optional/health/health-neuroskill-bci.md
upstream_blob: d011ca445536944c2b69bcb7ef0fa1b28b43ca97
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/health/health-neuroskill-bci
---

# Neuroskill Bci {#neuroskill-bci}

NeuroSkill から認知状態と気分のデータをそのまま受け取ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/health/neuroskill-bci` で入れます |
| パス | `optional-skills/health/neuroskill-bci` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent + Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `BCI`, `neurofeedback`, `health`, `focus`, `EEG`, `cognitive-state`, `biometrics`, `neuroskill` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# NeuroSkill BCI Integration {#neuroskill-bci-integration}

動作中の [NeuroSkill](https://neuroskill.com/) に Hermes をつなぎ、BCI ウェアラブルが
測っている脳と身体の値をそのまま読み取ります。認知状態をふまえた受け答えをする、
対処法を提案する、精神的なパフォーマンスの推移を追う、といった使い方ができます。

> **⚠️ 研究用途にかぎります** — NeuroSkill はオープンソースの研究用ツールです。
> 医療機器では**ありません**し、FDA・CE をはじめどの規制当局の認可も受けていません。
> ここで得た値を臨床の診断や治療に使わないでください。

指標の詳細は `references/metrics.md`、対処法の手順は `references/protocols.md`、
WebSocket / HTTP API は `references/api.md` にまとめてあります。

---

## 事前に必要なもの {#prerequisites}

- **Node.js 20 以上**が入っていること（`node --version` で確認します）
- **NeuroSkill のデスクトップアプリ**が動いていて、BCI 機器がつながっていること
- **BCI 機器**: Muse 2、Muse S、または OpenBCI（BLE 経由の 4 チャンネル EEG + PPG + IMU）
- `npx neuroskill status` がエラーなくデータを返すこと

### 準備できているか確かめる {#verify-setup}
```bash
node --version                    # Must be 20+
npx neuroskill status             # Full system snapshot
npx neuroskill status --json      # Machine-parseable JSON
```

`npx neuroskill status` がエラーになったら、次のように伝えます。

- NeuroSkill のデスクトップアプリを開いているか確認してください
- BCI 機器の電源が入っていて、Bluetooth でつながっているか確認してください
- 信号の状態を確認してください。NeuroSkill の表示が緑（電極ごとに 0.7 以上）になっていれば大丈夫です
- `command not found` と出るなら、Node.js 20 以上を入れてください

---

## コマンド一覧: `npx neuroskill <command>` {#cli-reference-npx-neuroskill-command}

どのコマンドも `--json`（そのままの JSON。パイプに流せます）と `--full`（人が読む要約 + JSON）を受け付けます。

| Command | Description |
|---------|-------------|
| `status` | システム全体の状態。機器・スコア・周波数帯・比率・睡眠・履歴 |
| `session [N]` | セッション 1 件の内訳。前半と後半の傾向つき（0 は直近） |
| `sessions` | 記録されているセッションを日付をまたいで一覧表示 |
| `search` | 脳の状態が似ている過去の場面を ANN で探す |
| `compare` | セッションを 2 つ並べて、指標の差と傾向を比べる |
| `sleep [N]` | 睡眠段階の判定（Wake / N1 / N2 / N3 / REM）と分析 |
| `label "text"` | いまこの瞬間に日時つきの注記を残す |
| `search-labels "query"` | 過去の注記をベクトル検索で意味から探す |
| `interactive "query"` | 4 層のグラフを横断して検索（text → EXG → labels） |
| `listen` | イベントをそのまま流し続ける（既定 5 秒、`--seconds N` で変更） |
| `umap` | セッション埋め込みを 3D の UMAP に投影 |
| `calibrate` | 較正の画面を開いてプロファイルを作成する |
| `timer` | 集中タイマーを起動（Pomodoro / Deep Work / Short Focus のプリセット） |
| `notify "title" "body"` | NeuroSkill アプリから OS の通知を送る |
| `raw '{json}'` | JSON をそのままサーバーへ渡す |

### 共通のフラグ {#global-flags}
| Flag | Description |
|------|-------------|
| `--json` | そのままの JSON を出力（ANSI なし、パイプに流せます） |
| `--full` | 人が読む要約 + 色つき JSON |
| `--port <N>` | サーバーのポートを指定（既定は自動検出。たいてい 8375） |
| `--ws` | WebSocket での通信を強制 |
| `--http` | HTTP での通信を強制 |
| `--k <N>` | 近傍をいくつ取るか（search, search-labels） |
| `--seconds <N>` | listen を続ける秒数（既定 5） |
| `--trends` | セッションごとの指標の傾向を表示（sessions） |
| `--dot` | Graphviz の DOT 形式で出力（interactive） |

---

## 1. いまの状態を見る {#1-checking-current-state}

### 現在の値を取る {#get-live-metrics}
```bash
npx neuroskill status --json
```

**必ず `--json` を付けてください**。付けないと色つきの読み物向けテキストが返るので、
そのままでは解析できません。

### 返ってくる主なフィールド {#key-fields-in-the-response}

`scores` オブジェクトに現在の指標がすべて入っています（断りがなければ 0〜1 の範囲です）。

```jsonc
{
  "scores": {
    "focus": 0.70,           // β / (α + θ) — sustained attention
    "relaxation": 0.40,      // α / (β + θ) — calm wakefulness
    "engagement": 0.60,      // active mental investment
    "meditation": 0.52,      // alpha + stillness + HRV coherence
    "mood": 0.55,            // composite from FAA, TAR, BAR
    "cognitive_load": 0.33,  // frontal θ / temporal α · f(FAA, TBR)
    "drowsiness": 0.10,      // TAR + TBR + falling spectral centroid
    "hr": 68.2,              // heart rate in bpm (from PPG)
    "snr": 14.3,             // signal-to-noise ratio in dB
    "stillness": 0.88,       // 0–1; 1 = perfectly still
    "faa": 0.042,            // Frontal Alpha Asymmetry (+ = approach)
    "tar": 0.56,             // Theta/Alpha Ratio
    "bar": 0.53,             // Beta/Alpha Ratio
    "tbr": 1.06,             // Theta/Beta Ratio (ADHD proxy)
    "apf": 10.1,             // Alpha Peak Frequency in Hz
    "coherence": 0.614,      // inter-hemispheric coherence
    "bands": {
      "rel_delta": 0.28, "rel_theta": 0.18,
      "rel_alpha": 0.32, "rel_beta": 0.17, "rel_gamma": 0.05
    }
  }
}
```

このほかに `device`（状態・電池・ファームウェア）、`signal_quality`（電極ごとに 0〜1）、
`session`（長さ・エポック数）、`embeddings`、`labels`、`sleep` の要約、`history` も含まれます。

### 読み取った値の伝え方 {#interpreting-the-output}

JSON を解析したら、指標を普通の言葉に置き換えて伝えます。数字だけを並べず、
必ず意味を添えてください。

**よい例:**
> 「いま集中度は 0.70 で、なかなかいい状態です。フロー状態の域に入っています。心拍も
> 68 bpm で安定していますし、FAA がプラスなので前向きに取り組めそうです。込み入った作業を
> 始めるならいまがおすすめです」

**よくない例:**
> 「Focus: 0.70, Relaxation: 0.40, HR: 68」

判断の目安になるおもな閾値です（詳しくは `references/metrics.md` にあります）。

- **集中度 > 0.70** → フロー状態の域。このまま守ります
- **集中度 &lt; 0.40** → 休憩か、対処法を提案します
- **眠気 > 0.60** → 疲労の警告。一瞬眠り込む危険があります
- **リラックス度 &lt; 0.30** → ストレスへの対処が必要です
- **認知負荷が 0.70 超のまま続く** → 頭の中を書き出すか、休憩します
- **TBR > 1.5** → シータ波が優位で、実行機能が落ちています
- **FAA &lt; 0** → 回避・ネガティブ寄り。FAA の立て直しを検討します
- **SNR &lt; 3 dB** → 信号が当てになりません。電極の位置を直すようすすめます

---

## 2. セッションを分析する {#2-session-analysis}

### セッション 1 件の内訳 {#single-session-breakdown}
```bash
npx neuroskill session --json         # most recent session
npx neuroskill session 1 --json       # previous session
npx neuroskill session 0 --json | jq '{focus: .metrics.focus, trend: .trends.focus}'
```

全指標が、**前半と後半を比べた傾向**（`"up"`、`"down"`、`"flat"`）つきで返ります。
セッションがどう変わっていったかを説明するのに使えます。

> 「集中度は 0.64 から始まって、終わりには 0.76 まで上がっていました。はっきりした上昇傾向です。
> 認知負荷は 0.38 から 0.28 に下がっていて、慣れてくるにつれて作業が自動的にこなせるように
> なっていったのだと思います」

### セッションを一覧する {#list-all-sessions}
```bash
npx neuroskill sessions --json
npx neuroskill sessions --trends      # show per-session metric trends
```

---

## 3. 過去を検索する {#3-historical-search}

### 脳の状態が似ている場面を探す {#neural-similarity-search}
```bash
npx neuroskill search --json                    # auto: last session, k=5
npx neuroskill search --k 10 --json             # 10 nearest neighbors
npx neuroskill search --start <UTC> --end <UTC> --json
```

128 次元の ZUNA 埋め込みに対して HNSW の近似最近傍探索をかけ、脳の状態が似ている過去の場面を
探します。距離の統計、時間帯ごとの分布、よく一致した日が返ります。

こんな質問をされたときに使います。

- 「前にこれと同じ状態だったのはいつ?」
- 「いちばん集中できていたセッションを探して」
- 「午後にバテるのはたいてい何時ごろ?」

### 注記を意味から探す {#semantic-label-search}
```bash
npx neuroskill search-labels "deep focus" --k 10 --json
npx neuroskill search-labels "stress" --json | jq '[.results[].EXG_metrics.tbr]'
```

注記の文章をベクトル埋め込み（Xenova/bge-small-en-v1.5）で検索します。一致した注記と、
それを残した時点の EXG の指標が返ります。

### 種類をまたいだグラフ検索 {#cross-modal-graph-search}
```bash
npx neuroskill interactive "deep focus" --json
npx neuroskill interactive "deep focus" --dot | dot -Tsvg > graph.svg
```

query → 注記の文章 → EXG の点 → 近くの注記、という 4 層のグラフです。`--k-text`、
`--k-EXG`、`--reach <minutes>` で調整できます。

---

## 4. セッションを比べる {#4-session-comparison}
```bash
npx neuroskill compare --json                   # auto: last 2 sessions
npx neuroskill compare --a-start <UTC> --a-end <UTC> --b-start <UTC> --b-end <UTC> --json
```

およそ 50 の指標について、変化量・変化率・向きが返ります。`insights.improved[]` と
`insights.declined[]` の配列、両方のセッションの睡眠段階、UMAP のジョブ ID も含まれます。

比べるときは差だけでなく、流れも添えて伝えてください。

> 「昨日は集中できていた時間帯が 2 つありました（午前 10 時と午後 2 時）。今日は 11 時ごろから
> 始まった 1 つがまだ続いています。全体の没入度は今日のほうが高いのですが、ストレスの山も
> 増えていて、ストレス指数が 15% 上がり、FAA がマイナスに振れる回数も多くなっています」

```bash
# Sort metrics by improvement percentage
npx neuroskill compare --json | jq '.insights.deltas | to_entries | sort_by(.value.pct) | reverse'
```

---

## 5. 睡眠のデータ {#5-sleep-data}
```bash
npx neuroskill sleep --json                     # last 24 hours
npx neuroskill sleep 0 --json                   # most recent sleep session
npx neuroskill sleep --start <UTC> --end <UTC> --json
```

エポック単位（5 秒ごと）の睡眠段階の判定と、その分析が返ります。

- **段階のコード**: 0=Wake、1=N1、2=N2、3=N3（深い睡眠）、4=REM
- **分析**: efficiency_pct、onset_latency_min、rem_latency_min、各段階の回数
- **健康的な目安**: N3 が 15〜25%、REM が 20〜25%、効率 85% 超、寝つきまで &lt;20 分

```bash
npx neuroskill sleep --json | jq '.summary | {n3: .n3_epochs, rem: .rem_epochs}'
npx neuroskill sleep --json | jq '.analysis.efficiency_pct'
```

睡眠・だるさ・回復の話が出たときに使います。

---

## 6. 瞬間に印をつける {#6-labeling-moments}
```bash
npx neuroskill label "breakthrough"
npx neuroskill label "studying algorithms"
npx neuroskill label "post-meditation"
npx neuroskill label --json "focus block start"   # returns label_id
```

次のような場面では、こちらから注記を残します。

- 何かがひらめいた、うまくいったと報告があったとき
- 別の種類の作業に移ったとき（たとえば「コードレビューに切り替える」）
- ひととおりの対処法をやり終えたとき
- いまの瞬間に印をつけてほしいと頼まれたとき
- 状態が大きく変わったとき（フローに入った、抜けた）

注記はデータベースに保存され、あとから `search-labels` や `interactive` で
引き出せるように索引が作られます。

---

## 7. その場で流し続ける {#7-real-time-streaming}
```bash
npx neuroskill listen --seconds 30 --json
npx neuroskill listen --seconds 5 --json | jq '[.[] | select(.event == "scores")]'
```

指定した時間のあいだ、WebSocket のイベント（EXG、PPG、IMU、scores、labels）をそのまま流します。
WebSocket の接続が要るので、`--http` では使えません。

ずっと見張っておきたいときや、対処法を試しているあいだの指標の動きを追いたいときに使います。

---

## 8. UMAP で可視化する {#8-umap-visualization}
```bash
npx neuroskill umap --json                      # auto: last 2 sessions
npx neuroskill umap --a-start <UTC> --a-end <UTC> --b-start <UTC> --b-end <UTC> --json
```

ZUNA 埋め込みを GPU で 3D の UMAP に投影します。`separation_score` は 2 つのセッションの
脳の状態がどれくらい離れているかを示します。

- **1.5 超** → 脳の状態としてはっきり別物です
- **&lt; 0.5** → どちらのセッションも似た脳の状態です

---

## 9. こちらから状態に気づく {#9-proactive-state-awareness}

### セッションの最初に確かめる {#session-start-check}
やりとりの最初に、機器を着けていると言われたときや状態を聞かれたときだけ、
状態を確認します。
```bash
npx neuroskill status --json
```

短く状態を伝えます。

> 「ちょっと確認しますね。集中度は 0.62 で上がってきていますし、リラックス度も 0.55 と
> よい感じです。FAA もプラスで前向きに取り組める状態です。出だしとしては上々です」

### こちらから状態に触れてよい場面 {#when-to-proactively-mention-state}

認知状態に触れるのは、次の場合**だけ**にします。

- はっきり聞かれたとき（「調子はどう?」「集中できてる?」）
- 集中できない、ストレスがある、疲れた、と言われたとき
- 危険な閾値を超えたとき（眠気が 0.70 超、集中度 &lt; 0.30 が続く）
- 頭を使う作業を前に、いま取りかかれる状態か聞かれたとき

フロー状態に入っているときに、指標を伝えるために**割り込まないでください**。集中度が 0.75 を
超えているなら、そのまま守ります。黙っているのが正解です。

---

## 10. 対処法を提案する {#10-suggesting-protocols}

指標から必要そうだと分かったら、`references/protocols.md` にある対処法を提案します。
始める前に必ず確認を取り、フロー状態には決して割り込まないでください。

> 「この 15 分ほど集中度が下がり続けていて、TBR も 1.5 を超えてきました。シータ波が優位に
> なって頭が疲れているサインです。Theta-Beta Neurofeedback Anchor を一緒にやってみますか?
> 90 秒ほどの運動で、数を数えるリズムと呼吸でシータ波を抑えてベータ波を持ち上げます」

きっかけになる主な状態です。

- **集中度 &lt; 0.40 かつ TBR > 1.5** → Theta-Beta Neurofeedback Anchor か Box Breathing
- **リラックス度 &lt; 0.30 かつ stress_index が高い** → Cardiac Coherence か 4-7-8 Breathing
- **認知負荷が 0.70 超のまま続く** → Cognitive Load Offload（頭の中の書き出し）
- **眠気 > 0.60** → Ultradian Reset か Wake Reset
- **FAA &lt; 0（マイナス）** → FAA Rebalancing
- **フロー状態（集中度 > 0.75、没入度 > 0.70）** → 割り込まないこと
- **stillness が高く headache_index も高い** → Neck Release Sequence
- **RMSSD が低い（&lt; 25ms）** → Vagal Toning

---

## 11. そのほかの道具 {#11-additional-tools}

### 集中タイマー {#focus-timer}
```bash
npx neuroskill timer --json
```
集中タイマーの画面を開きます。Pomodoro（25/5）、Deep Work（50/10）、
Short Focus（15/5）のプリセットがあります。

### 較正 {#calibration}
```bash
npx neuroskill calibrate
npx neuroskill calibrate --profile "Eyes Open"
```
較正の画面を開きます。信号の状態がよくないときや、その人に合わせた基準値を
作りたいときに役立ちます。

### OS の通知 {#os-notifications}
```bash
npx neuroskill notify "Break Time" "Your focus has been declining for 20 minutes"
```

### JSON をそのまま渡す {#raw-json-passthrough}
```bash
npx neuroskill raw '{"command":"status"}' --json
```
まだサブコマンドが用意されていないサーバー命令を使いたいときに。

---

## エラーへの対処 {#error-handling}

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `npx neuroskill status` が返ってこない | NeuroSkill アプリが動いていない | NeuroSkill のデスクトップアプリを開く |
| `device.state: "disconnected"` | BCI 機器がつながっていない | Bluetooth と機器の電池を確認する |
| スコアがすべて 0 になる | 電極が肌に触れていない | ヘッドバンドを付け直し、電極を湿らせる |
| `signal_quality` の値が &lt; 0.7 | 電極が緩んでいる | 装着を直し、電極の接触面を拭く |
| SNR &lt; 3 dB | 信号にノイズが多い | 頭を動かさないようにし、周囲の環境を確認する |
| `command not found: npx` | Node.js が入っていない | Node.js 20 以上を入れる |

---

## やりとりの例 {#example-interactions}

**「いま調子はどう?」**
```bash
npx neuroskill status --json
```
→ スコアを自然な言葉にして、集中度・リラックス度・気分と、目につく比率（FAA、TBR）に
  触れます。何かすべき状態のときだけ、行動を提案します。

**「集中できない」**
```bash
npx neuroskill status --json
```
→ 指標がそれを裏づけているか確かめます（シータ波が高い、ベータ波が低い、TBR が上がっている、眠気が高い）。
→ 裏づけがあれば、`references/protocols.md` から合いそうな対処法を提案します。
→ 指標に問題がなければ、脳の状態というよりやる気の問題かもしれません。

**「今日と昨日の集中度を比べて」**
```bash
npx neuroskill compare --json
```
→ 数字だけでなく流れを読み取ります。何がよくなり、何が落ちたのか、その原因として
  考えられることに触れます。

**「最後にフロー状態だったのはいつ?」**
```bash
npx neuroskill search-labels "flow" --json
npx neuroskill search --json
```
→ 日時とそのときの指標、そして注記から分かる作業内容を伝えます。

**「昨日はよく眠れた?」**
```bash
npx neuroskill sleep --json
```
→ 睡眠の構成（N3 の割合、REM の割合、効率）を伝え、健康的な目安と比べ、
  気になる点（覚醒のエポックが多い、REM が少ない）があれば添えます。

**「いまの瞬間に印をつけて。いいひらめきがあった」**
```bash
npx neuroskill label "breakthrough"
```
→ 注記を保存したことを伝えます。そのときの指標も添えておくと、あとで状態を思い出せます。

---

## 参考資料 {#references}

- [NeuroSkill の論文 — arXiv:2603.03212](https://arxiv.org/abs/2603.03212)（Kosmyna & Hauptmann、MIT Media Lab）
- [NeuroSkill デスクトップアプリ](https://github.com/NeuroSkill-com/skill)（GPLv3）
- [NeuroLoop CLI Companion](https://github.com/NeuroSkill-com/neuroloop)（GPLv3）
- [MIT Media Lab のプロジェクトページ](https://www.media.mit.edu/projects/neuroskill/overview/)
