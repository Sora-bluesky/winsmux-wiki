---
title: "ウェイクワード"
description: "手を使わずに済む Hey Hermes のウェイクワード — 話しかけるだけで音声対話が始まる、Hey Siri と同じ感覚で"
upstream_path: user-guide/features/wake-word.md
upstream_blob: 622532cd5f6885a4b0a6b6a548edf01ea92e2ccf
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/wake-word
---

# ウェイクワード（「Hey Hermes」） {#wake-word-hey-hermes}

ウェイクワードは、CLI・TUI・デスクトップアプリのどれでも Hermes を手ぶらで使える相棒に変えます。設定をひとつ入れておくと、Hermes は
背後で合図の言葉に耳をすませます。それを口にすると Hermes は新しい対話を始め、マイクを開き、
いつもの[音声のしくみ](/hermes/docs/user-guide/features/voice-mode/)であなたの用件を受け取り、
返事をします。「Hey Siri」や「Alexa」とまったく同じです。どの場所が聞き役になるかは
`surface` で選べます。

聞き取りは**すべて端末の中**で行われます。ずっと動いている聞き役が見ているのは合図の言葉だけで、
実際にエージェントへ用件を話しかけるまで、音声が端末の外に出ることはありません。

## 動きかた {#how-it-works}

1. `wake_word.enabled: true` にする（または `/wake on` を実行する）と、軽い合図の言葉の
   検出器が、設定した入力機器で耳をすませます。`wake_word.input_device` を設定していない場合は
   プロセスの既定のマイクを使います。
2. 合図の言葉が聞こえると検出器はいったん自分を止め（マイクを手放し）、新しい
   対話を始めて、音声の無音判定を使って発話をひとつ録音します。
3. 話した内容は文字に起こされてエージェントに送られます。返事が終わると、
   聞き役は自動で再開し、次の合図を待ちます。

この機能は**既定では切ってあります**。自分で入れるまで、何も聞いていません。

デスクトップアプリでは、手ぶらでの音声会話は
**「stop」と言うだけ**（「never mind」「goodbye」「cancel」「that's all」でも）で終わらせられます。
その言葉はエージェントに送られず、会話を閉じます。発話まるごとが
終わりの言葉と一致したときだけ反応するので、「stop the docker container」のような本当の用件はいつもどおり通ります。

## 離れた場所のデスクトップ（手元で音を拾う） {#remote-desktop-client-capture}

デスクトップアプリが**離れた場所**の Hermes（たとえば画面のない Docker ホストや
別の部屋の端末）につながっているとき、その先にはたいてい**マイクがありません**。
すると向こう側の PortAudio が失敗し、「ウェイクワード用のマイクを開けませんでした」という
メッセージが出ます。

Hermes はこの場合のために、**手元で音を拾う**やり方を用意しています。

1. デスクトップは `capture: client` でウェイクワードを構えます（つないだ先に入力機器がない
   ときは自動でこうなります。下の設定で明示することもできます）。
2. openWakeWord は変わらず**つないだ先で**動きます（同じエンジン、同じモデルです）。
3. デスクトップは**手元の Mac／PC のマイク**を開き、16 kHz モノラルの int16 に変換して、
   短い音のかたまりを `wake.feed` の RPC で送り続けます。
4. 検出できたら、つないだ先はいつもどおり `wake.detected` を出し、デスクトップは手元のマイクで
   ふだんの音声のしくみを動かします。

```yaml
wake_word:
  enabled: true
  capture: auto    # auto | local | client
  # auto   — local PortAudio unless the desktop arms with client_capture
  # local  — always open the backend mic (CLI/TUI default)
  # client — always expect wake.feed PCM from the desktop (remote-friendly)
```

デスクトップの画面からは `wake.start` に必ず `client_capture: true` が渡るので、マイクのない
離れた先でも自動的に手元で拾う形で構えます。CLI と TUI は、`capture: client` を自分で
指定しない限り、その場のマイクを使い続けます。

プライバシーについて: 手元で拾う場合、合図の言葉の音声データは認証済みの
デスクトップ↔バックエンド間の WebSocket（対話の残りと同じ通り道）を流れます。とはいえ検出のために
音声が外部のウェイクワード API へ送られることはありません。エンジンは、つないだ先のプロセスの中で完結します。

## エンジン {#engines}

| エンジン | 費用 | API キー | 備考 |
|--------|------|---------|-------|
| **openWakeWord**（既定） | 無料 | 不要 | 手元で動く ONNX のモデルです。**「hey hermes」**用のモデルが同梱されています（既定）。`hey_jarvis`、`alexa`、`hey_mycroft` などや、自作のモデルも使えます |
| **sherpa** | 無料 | 不要 | **語彙の縛りがありません** — 学習なしで、打ち込んだどんな言葉でも検出します。小さな英語モデルが初回の利用時に自動で落ちてきます（約 13 MB） |
| **Porcupine** | 無料枠／有料 | `PORCUPINE_ACCESS_KEY` | Picovoice のエンジンです。組み込みのキーワードと自作の `.ppn` ファイルが使えます |

既定の合図の言葉は**「hey hermes」**です。そのためのモデルが Hermes に同梱されているので、
学習なしでそのまま使えます。（初回の利用時に、openWakeWord が共通で使う特徴抽出のモデルを落としてきます。一度きりの小さなダウンロードです。）

どちらもウェイクワードを初めて有効にしたときにその場で入ります（`--include-desktop` を付けて
入れたデスクトップ版なら先に入っているので、耳はすぐ働きます）。前もって入れておくには、次を実行します。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[wake]"
```

## さっそく動かす {#quick-start}

```bash
# In an interactive `hermes` session:
/wake on        # start listening (installs the engine on first use)
/wake status    # show phrase, provider, and state
/wake off       # stop listening
```

デスクトップアプリでは、入力欄にある耳のアイコンを押します。

この切り替えがそのまま設定になります。`/wake` でもデスクトップの耳のボタンでも、入れたり切ったりすると
`~/.hermes/config.yaml` の `wake_word.enabled` に書き込まれるので、選んだ状態は次に立ち上げても残ります。手で書き換えることもできます。

```yaml
wake_word:
  enabled: true
```

## 設定 {#configuration}

```yaml
wake_word:
  enabled: false
  surface: auto               # eligible surface: "auto" | "cli" | "tui" | "gui"
  input_device: null           # PortAudio input index or device-name substring; null = process default
  capture: auto               # auto | local | client — where PCM is captured (see Remote desktop)
  provider: openwakeword      # "openwakeword" (free, local) | "sherpa" (free, any phrase) | "porcupine"
  phrase: "hey hermes"        # cosmetic label only — detection is keyed by the model/keyword below
  sensitivity: 0.6            # 0.0-1.0 — higher = stricter (fewer false triggers), consistent across all engines
  confirmation_frames: 3      # openWakeWord only — consecutive over-threshold frames required to fire
  start_new_session: true     # start a fresh session on wake vs. continue the current one
  openwakeword:
    model: hey_hermes         # bundled default; OR a built-in name OR a path to a custom .onnx/.tflite
    inference_framework: ""   # "" (auto) | "onnx" | "tflite"
  porcupine:
    keyword: jarvis           # built-in keyword OR path to a custom .ppn
```

`sensitivity`、`phrase`、`start_new_session` は、どちらのエンジンにも効きます。実際にどのモデルで
検出するかは、`openwakeword` と `porcupine` のかたまりで決まります。

`input_device` は、聞き役の PortAudio（`sounddevice`）のストリームにそのまま渡されます。
数値の機器番号か、他と紛れない機器名の一部を指定してください。この設定が変えるのは
ウェイクワードで音を拾う先だけで、デスクトップの押しっぱなし録音は今までどおりデスクトップアプリ側のマイクを使います。

### まわりの話し声で誤って反応するのを減らす {#reducing-false-triggers-on-ambient-speech}

openWakeWord は短い（約 80ms）音のかたまりを1つずつ採点するため、まわりの会話に混じった
音の切れ端が、たまたま1つのかたまりだけしきい値を超えて、意図せず反応してしまうことがあります。
これを抑える調整が2つあります。

- **`confirmation_frames`**（既定値 `3`、openWakeWord のみ） — 反応するまでに、しきい値を超えた
  かたまりが*連続で*いくつ必要かを決めます。本物の
  「hey hermes」なら高い点数が何かたまりも続きますが、まわりの物音は1つだけ跳ね上がって終わります。
  騒がしい部屋でまだ誤って反応するなら上げてください（`4`〜`5` など）。代わりに数十ミリ秒だけ反応が遅れます。`1` にすると、
  最初のかたまりで反応する昔の振る舞いに戻ります。
- **`sensitivity`**（既定値 `0.6`） — 検出のしきい値で、`0.0`〜`1.0` の範囲です。
  大きいほど厳しくなります（誤って反応しにくくなります）。この向きは
  **どのエンジンでも**同じで、openWakeWord ではかたまりごとの生の点数のしきい値に、
  sherpa ではキーワードのしきい値に対応し、Porcupine では内部で反転させて「大きいほど厳しい」を守っています。既定の `0.6` は
  openWakeWord の甘い `0.5` という基準より上に置いてあります。この基準のままだと「hey hor」のような
  惜しい聞き違いまで通っていました。まだ誤って反応するなら `0.8` の方へ、本物の「hey hermes」を
  取りこぼすなら下げてください。

`sherpa` と `porcupine` のエンジンは、言葉ぜんたいを内部で読み解くので、1つのかたまりだけ跳ね上がる
問題がありません。そのため `confirmation_frames` は無視されます（`sensitivity` は効きます）。

`inference_framework` は openWakeWord の実行基盤を選びます。空のまま（既定）にしておくと、
Hermes が環境に合わせて選びます。**Apple Silicon では tflite**、それ以外では onnx です。
openWakeWord の onnx は macOS の ARM64 でほぼゼロの点数を返すため（[openWakeWord#336](https://github.com/dscripka/openWakeWord/issues/336)）、
そこで `onnx` に固定すると、構えて聞いているように見えるのに一度も反応しません。macOS の tflite には
`ai-edge-litert` が要りますが、これは Hermes が他のウェイクワード用の依存と一緒に必要なときに入れます。

### 使う場所（CLI、TUI、GUI） {#surfaces-cli-tui-gui}

ウェイクワードは Hermes の3つの場所すべてで使えます。`surface` は、そのうちどれが聞き役になり、
反応したときに新しい対話を開くかを決めます。

| `surface` | 振る舞い |
|-----------|----------|
| `auto`（既定） | 手元のすべての場所が候補になり、最初に構えたものが聞き役になります。 |
| `cli` | 昔ながらの `hermes` CLI だけ。 |
| `tui` | `hermes --tui` だけ。 |
| `gui` | デスクトップアプリだけ。 |

検出は端末の中で、マイク1本で行われるので、聞き役になれるのは同時に1つだけです。Hermes を
別々のプロセスで立ち上げている場合も同じです。いったん決まった聞き役は動きません。
最初に名乗り出たものが、止まるか、切断されるか、そのプロセスが終わるまで聞き役を持ち続けます。Hermes が
黙って別の場所へ役を移すことはありません。最初に名乗り出た者勝ちではなく決め打ちにしたいときは、`surface` を設定してください。
TUI とデスクトップの画面は同じ Python のバックエンド（`tui_gateway`）を共有していて、
検出はサーバー側で動き、用件を録音している間はマイクを音声の取り込みに譲ります。

## 別の言葉を使う {#using-a-different-phrase}

「Hey Hermes」はそのまま使えます。同梱の openWakeWord のモデル
（`model: hey_hermes`）が既定だからです。別の言葉で呼びたいときは、語彙の縛りがない
エンジンを使うのがいちばん手軽です。

### 案A — sherpa（どんな言葉でも、学習なし） {#option-a-sherpa-any-phrase-zero-training}

使いたい言葉を打ち込むだけです。その場で分解されるので、「hey coder」でも
「computer」でも「wake up neo」でも構いません。

```yaml
wake_word:
  enabled: true
  provider: sherpa
  phrase: "hey coder"        # detection key — just type your phrase
```

小さな英語の検出モデル（約 13 MB）が、初回の利用時に一度だけ落ちてきます。プロファイルごとに
別の言葉を設定できるので、動かしているプロファイルすべてに「hey <プロファイル名>」を割り当てられます。

### 特定のプロファイルを呼び起こす（デスクトップ） {#waking-a-specific-profile-desktop}

sherpa のエンジンなら、聞き役ひとつでどのプロファイルでも呼び起こせます。設定で
`wake_word.enabled: true` になっているプロファイルは、自動で登録されます。言葉を設定していない場合は
`hey <profile name>` が既定になります。あるプロファイルの言葉を口にすると、
デスクトップアプリはそのプロファイルへその場で切り替わり、そこで新しい対話を開いて、
手ぶらでの音声を始めます。

- 「hey hermes」→ 既定のプロファイル
- 「hey coder」→ `coder` のプロファイル
- 「hey trader」→ `trader` のプロファイル

聞き役になっているプロファイルの設定で `wake_word.profile_routing: false` にすると、この振り分けをやめて
自分の言葉だけを聞くようになります。CLI と TUI はプロファイル1つで動くので、
別のプロファイルの言葉が聞こえたときは、切り替えのコマンド（`hermes -p <profile>`）を表示するだけで振り分けはしません。

名前は英語の下位語の音として照合されます。はっきりした2音節以上の名前を使った
2語の言葉がいちばんうまくいきます。とても短い名前、英語らしくない発音、似た響きの名前を持つプロファイルが2つある場合は
精度が落ちるので、必要ならプロファイルごとに `sensitivity` を調整してください。

### 案B — openWakeWord（無料、学習済みモデル） {#option-b-openwakeword-free-trained-model}

組み込みのモデル名（`hey_jarvis`、`alexa`、`hey_mycroft` など）を指定するか、いちばん確実にしたいなら
自分でモデルを学習させ（無料の Colab の GPU でおよそ 75〜90 分）、できた
`.onnx` ファイルをどこかに置いて、そこを指します。

```yaml
wake_word:
  enabled: true
  provider: openwakeword
  phrase: "computer"
  openwakeword:
    model: ~/.hermes/wakewords/computer.onnx   # or a built-in name like hey_jarvis
```

学習の参考になる場所です。

- [openWakeWord](https://github.com/dscripka/openWakeWord)
- [2026 年版の学習用 Colab](https://github.com/alfiedennen/openwakeword-colab-2026)

:::tip 特徴のある言葉を選ぶ
ふだんの会話とぶつからない言葉ほど、うまく働きます。あまり使われない単語で2音節のもの
（「hermes」はこれに当てはまります）は、「hello」や「stop」のようなありふれた言葉より優れています。
:::

### 案C — Porcupine（自作のキーワードをすぐ作る） {#option-c-porcupine-custom-keyword-in-seconds}

[Picovoice Console](https://console.picovoice.ai/) で「Hey Hermes」のキーワードを作り、
`.ppn` を落として、次のように設定します。

```yaml
wake_word:
  enabled: true
  provider: porcupine
  phrase: "hey hermes"
  porcupine:
    keyword: ~/.hermes/wakewords/hey_hermes.ppn
```

アクセスキーは `~/.hermes/.env` に書きます。

```bash
PORCUPINE_ACCESS_KEY=your-key-here
```

## 必要なもの {#requirements}

- 使えるマイクと、`sounddevice` ＋ `numpy` の音声まわり一式（声の機能と共通です）。
- 話した用件を文字に起こす提供元。手元で動く `faster-whisper` ならそのまま使えます。
  提供元の全一覧は [声で話す](/hermes/docs/user-guide/features/voice-mode/) を見てください。
- 返事を読み上げる提供元（既定の `edge-tts` はキーなしで動きます）。ウェイクワードの流れは
  最初から最後まで手ぶらなので、文字起こしと読み上げの両方が整うまで切り替えは構えるのを断ります。`hermes tools` の Voice の節で設定できます。
- ウェイクワードのエンジンの依存（自動で入るか、`hermes-agent[wake]` で入ります）。

聞き役が立ち上がらないときは、`/wake status` が何が足りないかをそのまま教えてくれます。

### 「聞いています」と出るのに反応しない（macOS） {#listening-but-never-wakes-macos}

macOS は、マイクの利用許可を**プロセスごと**に与えます。デスクトップアプリで文字起こしが動いているのは
*画面側*にマイクの許可があることの証拠でしかありません。ウェイクワードの聞き役は Python の
*バックエンド*で動くので、そちらにも別に許可が要ります。許可がないと、CoreAudio はバックエンドに
「動いている」ストリームを渡しはするものの、そこには無音しか流れてきません。だから耳は聞いているように見えるのに
言葉には一度も反応しません。Hermes はこれを見つけます（`/wake status` に
「mic delivers only silence」と出て、デスクトップの耳のツールチップにも同じ手がかりが出ます）。
直しかたは、システム設定 → プライバシーとセキュリティ → マイク で Hermes の
バックエンド（ターミナル、`python`、Hermes などの名前で並んでいます）を有効にし、そのうえで
ウェイクワードを切って入れ直すことです。

### 「聞いています」と出るのに無音しか届かない（Windows） {#listening-but-receives-silence-windows}

デスクトップの押しっぱなし録音と、ウェイクワードで音を拾う道筋は別物です。
押しっぱなし録音はデスクトップアプリのブラウザ側で音を拾い、
ウェイクワードの聞き役は Python のバックエンドで PortAudio のストリームを開きます。片方は動いているのに、
もう片方は無音の、あるいは使えない Windows の入力を選んでしまうことがあります。

`/wake status` は、選ばれている入力機器と Windows の音声ホスト API を教えてくれます。
無音だと報告されたら、`wake_word.input_device` にちゃんと動く PortAudio の入力の
番号か、他と紛れない名前を設定して、ウェイクワードを入れ直してください。

```bash
hermes config set wake_word.input_device "Microphone Array"
```

プロセスの既定に戻すには `null` を使います。

```bash
hermes config set wake_word.input_device null
```

## 注意と限界 {#notes-limits}

- **手元の場所だけ。** ウェイクワードが動くのは CLI、TUI、デスクトップの画面 —
  つまり手元のマイクがある場所です。マイクを持たないメッセージの窓口（Telegram、Discord など）では動きません。
- **マイクは一度に1つ。** 検出器は用件を録音している間はマイクを手放し、その発話が終わると
  また受け取ります。音声の取り込みと取り合いになることはありません。
- **プライバシー。** 合図の言葉の検出は端末の中で完結します。誤って反応するなら `sensitivity` を上げ、
  なかなか気づかないなら下げてください。
