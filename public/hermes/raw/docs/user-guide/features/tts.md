---
title: "音声と読み上げ"
description: "すべてのアプリで使える、文章の読み上げと音声メッセージの文字起こし"
upstream_path: user-guide/features/tts.md
upstream_blob: 3fbfce34b6e7bbcefa38b47b3117da2b47f011c6
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/tts
---

# 音声と読み上げ {#voice-tts}

Hermes Agent は、文章の読み上げと音声メッセージの文字起こしの両方を、すべてのメッセージアプリで使えます。

:::tip Nous の契約者の方へ
[Nous Portal](https://portal.nousresearch.com) の有料契約をお持ちなら、OpenAI TTS を **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** 経由で使えます。OpenAI の API キーを別に用意する必要はありません。新しく入れる場合は `hermes setup --portal` でログインすれば、ゲートウェイのツールを一度にまとめて有効にできます。すでに入れてある場合は、`hermes model` か `hermes tools` で **Nous Subscription** を選べば読み上げだけを切り替えられます。
:::

## 文章の読み上げ {#text-to-speech}

文章を音声に変えるのに、11 のプロバイダが使えます。

| プロバイダ | 品質 | 費用 | API キー |
|----------|---------|------|---------|
| **Edge TTS**（既定） | 良い | 無料 | 不要 |
| **ElevenLabs** | 非常に良い | 有料 | `ELEVENLABS_API_KEY` |
| **OpenAI TTS** | 良い | 有料 | `VOICE_TOOLS_OPENAI_KEY` |
| **MiniMax TTS** | 非常に良い | 有料 | `MINIMAX_API_KEY` または `MINIMAX_CN_API_KEY` |
| **Mistral（Voxtral TTS）** | 非常に良い | 有料 | `MISTRAL_API_KEY` |
| **Google Gemini TTS** | 非常に良い | 無料枠あり | `GEMINI_API_KEY` |
| **xAI TTS** | 非常に良い | 有料 | `XAI_API_KEY` |
| **DeepInfra TTS** | 良い | 有料 | `DEEPINFRA_API_KEY` |
| **NeuTTS** | 良い | 無料（手元で動く） | 不要 |
| **KittenTTS** | 良い | 無料（手元で動く） | 不要 |
| **Piper** | 良い | 無料（手元で動く） | 不要 |

### アプリごとの届き方 {#platform-delivery}

| アプリ | 届き方 | 形式 |
|----------|----------|--------|
| Telegram | 音声メッセージ（その場で再生できます） | Opus `.ogg` |
| Discord | 音声メッセージ（Opus/OGG）、無理ならファイル添付に切り替わります | Opus/MP3 |
| WhatsApp | 音声ファイルの添付 | MP3 |
| CLI | `~/.hermes/audio_cache/` に保存されます | MP3 |

### 設定 {#configuration}

```yaml
# In ~/.hermes/config.yaml
tts:
  provider: "edge"              # "edge" | "elevenlabs" | "openai" | "minimax" | "mistral" | "gemini" | "xai" | "deepinfra" | "neutts" | "kittentts" | "piper" — or "nous" for the managed Tool Gateway (written when you pick Nous Subscription in `hermes tools`)
  speed: 1.0                    # Global speed multiplier (provider-specific settings override this)
  edge:
    voice: "en-US-AriaNeural"   # 322 voices, 74 languages
    speed: 1.0                  # Converted to rate percentage (+/-%)
  elevenlabs:
    voice_id: "pNInz6obpgDQGcFmaJgB"  # Adam
    model_id: "eleven_multilingual_v2"
  openai:
    model: "gpt-4o-mini-tts"
    voice: "alloy"              # alloy, echo, fable, onyx, nova, shimmer
    base_url: "https://api.openai.com/v1"  # Override for OpenAI-compatible TTS endpoints
    speed: 1.0                  # 0.25 - 4.0
    # language: "es"            # Sent as lang_code — only for OpenAI-compatible endpoints that support it (e.g. Kokoro)
  minimax:
    region: "global"           # "global" or "cn"; see selection rules below
    model: "speech-02-hd"     # speech-02-hd (default), speech-02-turbo
    voice_id: "English_expressive_narrator"  # See https://platform.minimax.io/faq/system-voice-id
    speed: 1                    # 0.5 - 2.0
    vol: 1                      # 0 - 10
    pitch: 0                    # -12 - 12
    # base_url: "https://tts.example/v1/t2a_v2"  # Optional endpoint override for the selected region
  mistral:
    model: "voxtral-mini-tts-2603"
    voice_id: "c69964a6-ab8b-4f8a-9465-ec0925096ec8"  # Paul - Neutral (default)
  gemini:
    model: "gemini-2.5-flash-preview-tts"  # or gemini-3.1-flash-tts-preview
    voice: "Kore"               # 30 prebuilt voices: Zephyr, Puck, Kore, Enceladus, Gacrux, etc.
    audio_tags: false           # Enable hidden Gemini 3.1 TTS audio-tag insertion
    persona_prompt_file: ""      # Optional Markdown/text file with Gemini voice direction
  xai:
    voice_id: "eve"             # or a custom voice ID — see docs below
    language: "en"              # BCP-47 code (e.g. "en", "pt-BR") or "auto" for detection
    speed: 1.0                  # 0.7–1.5, playback speed (default: 1.0)
    auto_speech_tags: false     # insert expressive audio tags via LLM rewrite
    text_normalization: false   # normalize numbers/abbreviations/symbols to spoken form
    optimize_streaming_latency: 0  # 0–2, trades quality for lower latency (default: 0)
    sample_rate: 24000          # 22050 / 24000 (default) / 44100 / 48000
    bit_rate: 128000            # MP3 bitrate; only applies when codec=mp3
    # base_url: "https://api.x.ai/v1"   # Override via XAI_BASE_URL env var
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
  kittentts:
    model: KittenML/kitten-tts-nano-0.8-int8   # 25MB int8; also: kitten-tts-micro-0.8 (41MB), kitten-tts-mini-0.8 (80MB)
    voice: Jasper                               # Jasper, Bella, Luna, Bruno, Rosie, Hugo, Kiki, Leo
    speed: 1.0                                  # 0.5 - 2.0
    clean_text: true                            # Expand numbers, currencies, units
  piper:
    voice: en_US-lessac-medium                  # voice name (auto-downloaded) OR absolute path to .onnx
    # voices_dir: ''                            # default: ~/.hermes/cache/piper-voices/
    # use_cuda: false                           # requires onnxruntime-gpu
    # length_scale: 1.0                         # 2.0 = twice as slow
    # noise_scale: 0.667
    # noise_w_scale: 0.8
    # volume: 1.0                               # 0.5 = half as loud
    # normalize_audio: true
```

MiniMax TTS は、地域・接続先・使う資格情報をひとまとめに決めます。

- `region: "global"` は `https://api.minimax.io/v1/t2a_v2` を `MINIMAX_API_KEY` で使います。
- `region: "cn"` は `https://api.minimaxi.com/v1/t2a_v2` を `MINIMAX_CN_API_KEY` で使います。
- `region` を書かなかった場合は、これまでの動きに合わせて `MINIMAX_API_KEY` が優先されます。`MINIMAX_CN_API_KEY` だけを設定してある場合は、Hermes が `cn` を選びます。
- 地域をはっきり指定したときは、その地域に対応する資格情報が必要です。Hermes がもう一方の地域のキーを流用することはありません。`base_url` で接続先を上書きしても使う資格情報は変わりませんし、もう一方の地域の公式の接続先を指す上書きは拒否されます。

**速さの調整**：全体に効く `tts.speed` の値が、既定ではすべてのプロバイダに適用されます。各プロバイダは自分の `speed` の設定でこれを上書きできます（たとえば `tts.openai.speed: 1.5`）。プロバイダごとの速さのほうが全体の値より優先されます。既定は `1.0`（等倍）です。

### Gemini の人物像プロンプト {#gemini-persona-prompts}

Gemini TTS は、話し方の指示を普通の文章で受け取れます。`tts.gemini.persona_prompt_file` に、声の人物像を書いた手元の Markdown またはテキストのファイルを指定してください。ファイルには `AUDIO PROFILE`、`SCENE`、`DIRECTOR'S NOTES`、`SAMPLE CONTEXT`、`TRANSCRIPT` といった Gemini 流の節を書けます。

ファイルに `{transcript}` または `{{ transcript }}` が含まれていれば、Hermes はその場所を実際に読み上げる文章に置き換えます。含まれていない場合は、`TRANSCRIPT` の見出しを付けた節を自動で末尾に足します。人物像のプロンプトは手元にとどまり、チャットの返事には出てきません。

```yaml
tts:
  provider: gemini
  gemini:
    voice: Algieba
    persona_prompt_file: ~/.hermes/tts/butler-voice.md
```

### 音声タグ（Gemini、xAI） {#audio-tags-gemini-xai}

Google の Gemini 3.1 Flash TTS と xAI の Grok TTS は、`[whispers]`、`[excitedly]`、`[very slow]`、`[laughs]` のような角かっこの音声タグを自由に書けます。話し方の指示をそのまま書けるということです。`tts.gemini.audio_tags` か `tts.xai.auto_speech_tags` を有効にすると、Hermes は読み上げの前に見えないところで書き換えの一手間を挟みます。書き換えでタグが差し込まれるのは読み上げ用の原稿だけで、チャットに見える返事は変わりません。

```yaml
tts:
  provider: gemini
  gemini:
    model: gemini-3.1-flash-tts-preview
    audio_tags: true
  xai: 
    auto_speech_tags: true
```

この書き換えは `auxiliary.tts_audio_tags` を使い、既定ではふだんのチャットのモデルが担当します。タグの差し込みをもっと安いモデルや速いモデルに任せたいときは、この補助タスクの設定を上書きしてください。

**言語（OpenAI 互換の接続先の場合）**：`tts.openai.language` は `lang_code` という要求の項目として接続先に渡されます。これは `lang_code` に対応した OpenAI 互換の読み上げサーバー向けの設定です。たとえば [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) では、`language: "es"` にすると既定の英語ではなくスペイン語の音素化が選ばれます。この項目を受け取らない公式の OpenAI API を使うときは、設定しないままにしてください。設定しなければ、余計なものは何も送られません。

### 入力の長さの上限 {#input-length-limits}

各プロバイダには、1 回の要求で受け取れる文字数の上限が公開されています。Hermes は長い返事を、文の切れ目を見ながら順番どおりの塊に分けてからプロバイダを呼ぶので、整えた文章が黙って切り捨てられることはありません。

| プロバイダ | 既定の上限（文字） |
|----------|---------------------|
| Edge TTS | 5000 |
| OpenAI | 4096 |
| xAI | 15000 |
| MiniMax | 10000 |
| Mistral | 4000 |
| Google Gemini | 32000 |
| ElevenLabs | モデルごと（下記を参照） |
| NeuTTS | 2000 |
| KittenTTS | 2000 |
| Piper | 5000 |

**ElevenLabs** は、設定した `model_id` から上限を決めます。

| `model_id` | 上限（文字） |
|------------|-------------|
| `eleven_flash_v2_5` | 40000 |
| `eleven_flash_v2` | 30000 |
| `eleven_multilingual_v2`（既定）、`eleven_multilingual_v1`、`eleven_english_sts_v2`、`eleven_english_sts_v1` | 10000 |
| `eleven_v3`、`eleven_ttv_v3` | 5000 |
| 知らないモデル | プロバイダの既定（10000）に戻ります |

**プロバイダごとに上書きする**には、読み上げの設定でそのプロバイダの節に `max_text_length:` を書きます。

```yaml
tts:
  openai:
    max_text_length: 8192   # raise or lower the provider cap
```

有効なのは正の整数だけです。0、負の数、数字でない値、真偽値はプロバイダの既定に落ちるので、設定を書き損じてもプロバイダ側の上限をうっかり超えてしまうことはありません。

### Telegram の音声メッセージと ffmpeg {#telegram-voice-bubbles-ffmpeg}

Telegram の音声メッセージには Opus/OGG の形式が必要です。

- **OpenAI、ElevenLabs、Mistral** はそのまま Opus を出せるので、追加の準備はいりません
- **Edge TTS**（既定）は MP3 を出すので、変換のために **ffmpeg** が必要です
- **MiniMax TTS** は MP3 を出すので、Telegram の音声メッセージにするには **ffmpeg** が必要です
- **Google Gemini TTS** は生の PCM を出すので、Telegram の音声メッセージ用に **ffmpeg** で直接 Opus に変換します
- **xAI TTS** は MP3 を出すので、Telegram の音声メッセージにするには **ffmpeg** が必要です
- **NeuTTS** は WAV を出すので、こちらも Telegram の音声メッセージにするには **ffmpeg** が必要です
- **KittenTTS** は WAV を出すので、こちらも Telegram の音声メッセージにするには **ffmpeg** が必要です
- **Piper** は WAV を出すので、こちらも Telegram の音声メッセージにするには **ffmpeg** が必要です

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Fedora
sudo dnf install ffmpeg
```

ffmpeg がないと、Edge TTS、MiniMax TTS、NeuTTS、KittenTTS、Piper の音声は普通の音声ファイルとして送られます（再生はできますが、音声メッセージではなく四角い再生器の見た目になります）。

:::tip
ffmpeg を入れずに音声メッセージにしたい場合は、OpenAI、ElevenLabs、Mistral のいずれかに切り替えてください。
:::

### xAI のカスタム音声（声の複製） {#xai-custom-voices-voice-cloning}

xAI では、自分の声を複製して読み上げに使えます。[xAI Console](https://console.x.ai/team/default/voice/voice-library) でカスタム音声を作り、できあがった `voice_id` を設定に書いてください。

```yaml
tts:
  provider: xai
  xai:
    voice_id: "nlbqfwie"   # your custom voice ID
```

録音の仕方、対応する形式、制限については [xAI Custom Voices docs](https://docs.x.ai/developers/model-capabilities/audio/custom-voices) を参照してください。

### Piper（手元で動く、44 言語） {#piper-local-44-languages}

Piper は Open Home Foundation（Home Assistant を保守している人たち）が作った、手元で速く動くニューラル読み上げエンジンです。すべて CPU だけで動き、**44 言語**の学習済み音声が使え、API キーもいりません。

**`hermes tools` から入れる** → Voice & TTS → Piper と進むと、Hermes が `pip install piper-tts` を代わりに実行します。自分で入れる場合は `pip install piper-tts` です。

**Piper に切り替える：**

```yaml
tts:
  provider: piper
  piper:
    voice: en_US-lessac-medium
```

手元にない音声で初めて読み上げるとき、Hermes は `python -m piper.download_voices <name>` を実行してモデル（品質の段階に応じて 20〜90MB ほど）を `~/.hermes/cache/piper-voices/` に取り込みます。2 回目からは取り込んだモデルを使い回します。

**音声の選び方。** [full voice catalog](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md) には英語、スペイン語、フランス語、ドイツ語、イタリア語、オランダ語、ポルトガル語、ロシア語、ポーランド語、トルコ語、中国語、アラビア語、ヒンディー語などが並び、それぞれに `x_low` / `low` / `medium` / `high` の品質の段階があります。試聴は [rhasspy.github.io/piper-samples](https://rhasspy.github.io/piper-samples/) でできます。

**すでに取り込んである音声を使う場合。** `tts.piper.voice` に `.onnx` で終わる絶対パスを書きます。

```yaml
tts:
  piper:
    voice: /path/to/my-custom-voice.onnx
```

**細かい調整**（`tts.piper.length_scale` / `noise_scale` / `noise_w_scale` / `volume` / `normalize_audio`、`use_cuda`）は、Piper の `SynthesisConfig` と 1 対 1 で対応します。古い `piper-tts` では無視されます。

### コマンド型の自作プロバイダ {#custom-command-providers}

使いたい読み上げエンジンがそのままでは対応していない場合（VoxCPM、MLX-Kokoro、XTTS CLI、声を複製するスクリプトなど、コマンドとして呼べるもの）、**コマンド型のプロバイダ**として組み込めます。Python を書く必要はありません。Hermes が入力の文章を UTF-8 の一時ファイルに書き、指定したコマンドを実行し、そのコマンドが作った音声ファイルを読み取ります。

`tts.providers.<name>` の下にプロバイダを 1 つ以上書き、`tts.provider: <name>` で切り替えます。`edge` や `openai` のような最初から入っているものと同じ切り替え方です。

```yaml
tts:
  provider: voxcpm                 # pick any name under tts.providers
  providers:
    voxcpm:
      type: command
      command: "voxcpm --ref ~/voice.wav --text-file {input_path} --out {output_path}"
      output_format: mp3
      timeout: 180
      voice_compatible: true       # try to deliver as a Telegram voice bubble

    mlx-kokoro:
      type: command
      command: "python -m mlx_kokoro --in {input_path} --out {output_path} --voice {voice}"
      voice: af_sky
      output_format: wav

    piper-custom:                  # native Piper also supports custom .onnx via tts.piper.voice
      type: command
      command: "piper -m /path/to/custom.onnx -f {output_path} < {input_path}"
      output_format: wav
```

**`output_format` に書ける値：** `mp3`（既定）、`wav`、`ogg`、`flac`、`m4a`、`aac`、`amr`、`opus`。指定した形式を実際に出すのはコマンドの責任です（たとえば `ffmpeg` を使います）。Hermes は書かれた値の正しさを確かめ、出力ファイルの名前をそれに合わせるだけです。知らない値のときは `mp3` に戻ります。選ばれた形式は `{format}` の差し込み記号としてコマンドにも渡されます。

**コマンドを動かすときの環境変数：** コマンド型のプロバイダ（読み上げも文字起こしも）は、Hermes の秘密の値を子プロセスの環境から取り除いた状態で動きます。窓口のボットのトークン、LLM プロバイダの API キー、内部の中継の資格情報は消され、`PATH`、`HOME`、地域設定など普通の変数はそのまま残ります。コマンドの中で環境変数から自前の API キーを読みたい場合（`curl` の一行など）は、そのプロバイダの設定の `env_passthrough` に変数名を並べてください。

```yaml
tts:
  providers:
    mycloud:
      type: command
      command: 'curl -s -H "Authorization: Bearer $MYCLOUD_API_KEY" ... -o {output_path}'
      env_passthrough: [MYCLOUD_API_KEY]
```

#### 例：Doubao（中国語の seed-tts-2.0） {#example-doubao-chinese-seed-tts-20}

ByteDance の [seed-tts-2.0](https://www.volcengine.com/docs/6561/1257544) の双方向ストリーミング API を使って質の高い中国語の読み上げをしたいときは、PyPI の [`doubao-speech`](https://pypi.org/project/doubao-speech/) を入れて、コマンド型のプロバイダとして組み込みます。

```bash
pip install doubao-speech
export VOLCENGINE_APP_ID="your-app-id"
export VOLCENGINE_ACCESS_TOKEN="your-access-token"
```

```yaml
tts:
  provider: doubao
  providers:
    doubao:
      type: command
      command: "doubao-speech say --text-file {input_path} --out {output_path}"
      output_format: mp3
      max_text_length: 1024
      timeout: 30
```

資格情報はシェルの環境変数（`VOLCENGINE_APP_ID` / `VOLCENGINE_ACCESS_TOKEN`）か `~/.doubao-speech/config.yaml` から読まれます。声を選ぶには、コマンドに `--voice zh-female-warm`（あるいは `doubao-speech list-voices` に出るほかの名前）を足してください。`doubao-speech` にはストリーミングの音声認識も同梱されています。Hermes との組み合わせ方は [STT section below](#example-doubao--volcengine-asr) を参照してください。ソースと詳しい説明は [github.com/Hypnus-Yuan/doubao-speech](https://github.com/Hypnus-Yuan/doubao-speech) にあります。

#### 差し込み記号 {#placeholders}

コマンドの雛形では、次の差し込み記号を使えます。Hermes は実行の直前にこれらを置き換え、置かれた文脈（引用なし／単引用符の中／二重引用符の中）に合わせてシェル用の引用を付けるので、空白などシェルが特別扱いする文字を含むパスでも安全です。

| 差し込み記号      | 意味                                              |
|------------------|------------------------------------------------------|
| `{input_path}`   | Hermes が書き出した UTF-8 の一時テキストファイルの場所        |
| `{text_path}`    | `{input_path}` の別名                             |
| `{output_path}`  | コマンドが音声を書き出すべき場所                 |
| `{format}`       | `mp3` / `wav` / `ogg` / `flac`                       |
| `{voice}`        | `tts.providers.<name>.voice`。未設定なら空       |
| `{model}`        | `tts.providers.<name>.model`                         |
| `{speed}`        | 決まった速さの倍率（プロバイダごと、または全体）       |

かっこの文字そのものを書きたいときは `{{` と `}}` を使います。

#### 任意の設定項目 {#optional-keys}

| 項目                | 既定 | 意味                                                                                                    |
|--------------------|---------|------------------------------------------------------------------------------------------------------------|
| `timeout`          | `120`   | 音沙汰のない秒数。標準出力か標準エラー出力に何か出るたびに数え直します。動きが止まったままだとプロセスの一族ごと終了させます（Unix は `killpg`、Windows は `taskkill /T`）。 |
| `output_format`    | `mp3`   | `mp3` / `wav` / `ogg` / `flac` のいずれか。Hermes が出力先を決めた場合は、その拡張子から自動で推定します。      |
| `voice_compatible` | `false` | `true` にすると、Hermes が ffmpeg で MP3/WAV を Opus/OGG に変換し、Telegram で音声メッセージとして表示されるようにします。      |
| `max_text_length`  | `5000`  | コマンド 1 回あたりの入力文字数の上限。これより長い文章は順番どおりの塊に分けられます。                  |
| `voice` / `model`  | 空   | 差し込み記号の値としてコマンドに渡されるだけです。                                                           |

#### 挙動についての補足 {#behavior-notes}

- **最初から入っている名前が必ず勝ちます。** `tts.providers.openai` を書いても、本来の OpenAI プロバイダが隠されることはありません。利用者の設定が、最初から入っているものを黙って置き換えることはできません。
- **既定の届き方はファイル添付です。** コマンド型のプロバイダは、どのアプリでも普通の音声ファイルとして届きます。音声メッセージにしたい場合は、プロバイダごとに `voice_compatible: true` を書いて選んでください。
- **コマンドの失敗はエージェントまで届きます。** 終了コードが 0 でない、出力が空、時間切れのいずれでも、コマンドの標準エラー出力や標準出力を添えたエラーが返るので、会話の中でそのプロバイダの様子を調べられます。
- **`command:` を書けば `type: command` は既定です。** `type: command` をはっきり書くのは良い習慣ですが必須ではありません。`command` に中身のある文字列が書かれていれば、コマンド型のプロバイダとして扱われます。
- **`{input_path}` と `{text_path}` はどちらを使っても同じです。** コマンドの中で読みやすいほうを選んでください。

#### 安全上の注意 {#security}

コマンド型のプロバイダは、設定したシェルのコマンドを、あなたの権限でそのまま実行します。Hermes は差し込み記号の値に引用を付け、設定した時間切れを守りますが、コマンドの雛形そのものは信頼された手元の入力として扱われます。PATH に置いてあるシェルスクリプトと同じつもりで扱ってください。

### Python プラグインのプロバイダ {#python-plugin-providers}

シェルのコマンド 1 本では書き表せない読み上げエンジン（CLI のない Python SDK、ストリーミング型のエンジン、声の一覧を返す API、OAuth で更新される認証など）には、`ctx.register_tts_provider()` で Python のプラグインを登録します。プラグインは [コマンド型の自作プロバイダ](#custom-command-providers) の仕組みを**置き換えるのではなく、並んで存在します**。自分のエンジンに合うほうを選んでください。

#### どちらを選ぶか {#when-to-pick-which}

| 使いたいものが… | 選ぶもの |
|---|---|
| ファイルか標準入力から文章を読み、ファイルか標準出力へ音声を書く CLI 1 本 | **コマンド型のプロバイダ**（Python は不要） |
| シェルのパイプでつないだ 2〜3 本の CLI | **コマンド型のプロバイダ** |
| Python SDK だけがあり、CLI はない | **プラグイン** |
| 生成の途中から音声メッセージを送りたい、ストリーミングのバイト列 | **プラグイン**（`stream()` を上書き） |
| `hermes setup` から使う、声の一覧を返す API | **プラグイン**（`list_voices()` を上書き） |
| 固定のトークンではなく OAuth で更新する認証 | **プラグイン** |

最初から入っているものが必ず勝ち、コマンド型のプロバイダは同じ名前のプラグインより優先されます。ですから、最初から入っているもの以外の名前でプラグインを登録する分には、いまの設定が隠されてしまう心配はいりません。

#### 最小のプラグイン {#minimal-plugin}

これを `~/.hermes/plugins/my-tts/` に置きます。

`plugin.yaml`:
```yaml
name: my-tts
version: 0.1.0
description: "My custom Python TTS backend"
```

`__init__.py`:
```python
from agent.tts_provider import TTSProvider

class MyTTSProvider(TTSProvider):
    @property
    def name(self) -> str:
        return "my-tts"  # what tts.provider matches against

    @property
    def display_name(self) -> str:
        return "My Custom TTS"

    def is_available(self) -> bool:
        # Return False when credentials/deps are missing — picker skips
        # this row but the dispatcher still routes here on explicit config.
        import os
        return bool(os.environ.get("MY_TTS_API_KEY"))

    def synthesize(self, text, output_path, *, voice=None, model=None,
                   speed=None, format="mp3", **extra) -> str:
        # Write audio bytes to output_path, return the path.
        # Raise on failure — the dispatcher converts exceptions to a
        # standard error envelope.
        import my_tts_sdk
        client = my_tts_sdk.Client()
        audio_bytes = client.synthesize(text=text, voice=voice or "default")
        with open(output_path, "wb") as f:
            f.write(audio_bytes)
        return output_path

def register(ctx):
    ctx.register_tts_provider(MyTTSProvider())
```

有効にして（`hermes plugins enable my-tts`）、`config.yaml` の `tts.provider` をそれに向ければ（`tts.provider: my-tts`）、`text_to_speech` ツールがそのプラグインを通るようになります。

#### 任意の差し込み口 {#optional-hooks}

より深く組み合わせたい場合は、プロバイダのクラスで次を上書きします。

- `list_voices()` → `hermes tools` に表示される `{id, display, language, gender, preview_url}` の辞書の一覧を返します。
- `list_models()` → `{id, display, languages, max_text_length}` の辞書の一覧を返します。
- `get_setup_schema()` → `{name, badge, tag, env_vars: [{key, prompt, url}]}` を返し、`hermes tools` / `hermes setup` の選択肢の行を作ります。これがなくてもプラグインは動きますが、選択肢に出る行は素っ気ないものになります。
- `stream(text, *, voice, model, format, **extra)` → 音声のバイト列を順に返す反復子で、少しずつ届けるのに使います（既定では `NotImplementedError` を投げます）。
- `voice_compatible` の属性 → 出力が Opus と互換で、窓口に音声メッセージとして届けてほしい場合は `True` にします（既定の `False` は普通の音声ファイル添付です）。

説明文まで含めた抽象基底クラスの全体は `agent/tts_provider.py` にあります。

## 音声メッセージの文字起こし（STT） {#voice-message-transcription-stt}

Telegram、Discord、WhatsApp、Slack、Signal で送られた音声メッセージは、自動で文字に起こされて会話に文章として差し込まれます。エージェントからは普通の文章として見えます。

| プロバイダ | 品質 | 費用 | API キー |
|----------|---------|------|---------| 
| **Local Whisper**（既定） | 良い | 無料 | 不要 |
| **Groq Whisper API** | 良い〜最良 | 無料枠あり | `GROQ_API_KEY` |
| **OpenAI Whisper API** | 良い〜最良 | 有料 | `VOICE_TOOLS_OPENAI_KEY` または `OPENAI_API_KEY` |

:::info 設定なしで動きます
`faster-whisper` が入っていれば、手元での文字起こしはそのまま動きます。それが使えない場合、Hermes は `/opt/homebrew/bin` などよく使われる場所にある手元の `whisper` CLI や、`HERMES_LOCAL_STT_COMMAND` で指定した自作のコマンドも使えます。
:::

### 設定 {#configuration}

```yaml
# In ~/.hermes/config.yaml
stt:
  provider: "local"           # "local" | "groq" | "openai" | "mistral" | "xai" | "elevenlabs" | "deepinfra"
  language: "en"              # Global language hint applied to every provider unless a per-provider language overrides it; set "" to restore auto-detect
  local:
    model: "base"             # tiny, base, small, medium, large-v3
    language: ""              # optional ISO-639-1 hint; blank = use HERMES_LOCAL_STT_LANGUAGE if set, else auto-detect
  groq:
    language: ""              # optional ISO-639-1 hint; blank = use HERMES_LOCAL_STT_LANGUAGE if set, else auto-detect
  openai:
    model: "whisper-1"        # whisper-1, gpt-4o-mini-transcribe, gpt-4o-transcribe, gpt-transcribe
  mistral:
    model: "voxtral-mini-latest"  # voxtral-mini-latest, voxtral-mini-2602
  xai:
    model: "grok-stt"         # xAI Grok STT
    language: ""              # optional ISO-639-1 hint; blank = use HERMES_LOCAL_STT_LANGUAGE if set, else "en"
```

### プロバイダごとの詳細 {#provider-details}

**Local（faster-whisper）** — [faster-whisper](https://github.com/SYSTRAN/faster-whisper) を通じて Whisper を手元で動かします。既定では CPU を使い、GPU があればそちらを使います。モデルの大きさは次のとおりです。

| モデル | 容量 | 速さ | 品質 |
|-------|------|-------|---------|
| `tiny` | 約 75 MB | 最速 | 最低限 |
| `base` | 約 150 MB | 速い | 良い（既定） |
| `small` | 約 500 MB | 中くらい | より良い |
| `medium` | 約 1.5 GB | 遅め | かなり良い |
| `large-v3` | 約 3 GB | 最も遅い | 最良 |

**Groq API** — `GROQ_API_KEY` が必要です。無料で使えるクラウドの文字起こしを予備に置きたいときに向きます。言語が分かっている音声では、`stt.groq.language`（または全体に効く環境変数 `HERMES_LOCAL_STT_LANGUAGE`）を設定すると、Whisper の自動判定を省いて待ち時間を減らせます。

**OpenAI API** — まず `VOICE_TOOLS_OPENAI_KEY` を見て、なければ `OPENAI_API_KEY` を使います。`whisper-1`、`gpt-4o-mini-transcribe`、`gpt-4o-transcribe`、`gpt-transcribe` に対応します。

**Mistral API（Voxtral Transcribe）** — `MISTRAL_API_KEY` が必要です。Mistral の [Voxtral Transcribe](https://docs.mistral.ai/capabilities/audio/speech_to_text/) のモデルを使います。13 言語、話者の区別、単語ごとの時刻に対応します。導入は `cd ~/.hermes/hermes-agent && uv pip install -e ".[mistral]"` です。

**xAI Grok STT** — `XAI_API_KEY` が必要です。`https://api.x.ai/v1/stt` に multipart/form-data で送ります。チャットや読み上げですでに xAI を使っていて、API キーを 1 つにまとめたい場合に向きます。自動で選ぶ順番では Groq の後ろなので、優先させたいときは `stt.provider: xai` をはっきり指定してください。

**手元の自作コマンドを予備にする** — 手元の文字起こしコマンドを Hermes から直接呼びたい場合は `HERMES_LOCAL_STT_COMMAND` を設定します。コマンドの雛形では `{input_path}`、`{output_dir}`、`{language}`、`{model}` の差し込み記号を使えます。Hermes は置き換え後の雛形を引数の並びに切り分け、シェルを介さずに実行するので、`|`、`>`、`&&`、`;` といった記号はそのまま文字の引数として渡ります。コマンドは `{output_dir}` の下のどこかに `.txt` の書き起こしを書き出す必要があります。

#### 例：Doubao / Volcengine の音声認識 {#example-doubao-volcengine-asr}

Doubao の読み上げに [`doubao-speech`](https://pypi.org/project/doubao-speech/) を使っているなら（[above](#example-doubao-chinese-seed-tts-20) を参照）、同じパッケージが手元コマンド型の文字起こしとしても働きます。

```bash
pip install doubao-speech
export VOLCENGINE_APP_ID="your-app-id"
export VOLCENGINE_ACCESS_TOKEN="your-access-token"
export HERMES_LOCAL_STT_COMMAND='doubao-speech transcribe {input_path} --out {output_dir}/transcript.txt'
```

信頼できる手元の雛形で、どうしてもパイプやリダイレクトなどシェルの機能が必要なときは、シェルをはっきり呼び出してください。動的に変わるパスはシェルのプログラム本体から外に出し、位置引数として渡します。

```bash
export HERMES_LOCAL_STT_COMMAND='sh -c '\''whisper "$1" --output_format txt --output_dir "$2" | tee "$2/whisper.log"'\'' _ {input_path} {output_dir}'
```

Windows では代わりに `cmd /c` や PowerShell の呼び出しをはっきり書きます。こうして包んでおけば、シェルとして解釈するかどうかが、手元の文字起こしの雛形すべてに暗黙に付いてくる性質ではなく、書いた引数の並びから自分で選んだことになります。

```yaml
stt:
  provider: local_command
```

Hermes は届いた音声メッセージを `{input_path}` に書き、コマンドを実行し、`{output_dir}` の下にできた `.txt` を読みます。言語は Volcengine の bigmodel の接続先が自動で判定します。

### 代わりの選び方 {#fallback-behavior}

`stt.provider` を**はっきり選んである**場合（`hermes tools` などで `config.yaml` に書かれている場合）、その選択は厳格に守られます。そのプロバイダが動かせないときは、黙ってほかのエンジンに切り替えるのではなく、はっきりしたエラー（`stt is configured to use <provider> (set via hermes tools), but <failure>. Run 'hermes tools' to change it.`）を出して文字起こしが失敗します。設定に書かれた `stt.provider: local` も、はっきり選んだものとして数えられます。

**一度も選ばれていない**ときは、Hermes が使えるものから自動で判断します。
- **手元の faster-whisper が使えない** → クラウドのプロバイダより先に、手元の `whisper` CLI か `HERMES_LOCAL_STT_COMMAND` を試します
- **Groq のキーが未設定** → 飛ばして次に使えるものへ
- **OpenAI のキーが未設定** → 飛ばして次に使えるものへ
- **Mistral のキーか SDK が未設定** → 自動判断では飛ばし、次に使えるものへ進みます
- **どれも使えない** → 音声メッセージはそのまま通り、事情を正しく伝える一言が利用者に届きます

### STT のコマンド型自作プロバイダ {#stt-custom-command-providers}

使いたい文字起こしエンジンがそのままでは対応していない場合（Doubao の音声認識、NVIDIA Parakeet、自分でビルドした whisper.cpp、オープンソースの SenseVoice の CLI など、シェルのコマンドとして呼べるもの）、**コマンド型のプロバイダ**として組み込めます。Python を書く必要はありません。Hermes が音声ファイルに対して指定のコマンドを実行し、書き起こしを読み取ります。

`stt.providers.<name>` の下にプロバイダを 1 つ以上書き、`stt.provider: <name>` で切り替えます。形は読み上げの [command-provider registry](#custom-command-providers) と同じで、入力が音声・出力が書き起こしという向きに合わせてあります。

```yaml
stt:
  provider: parakeet                # pick any name under stt.providers
  providers:
    parakeet:
      type: command
      command: "parakeet-asr --model nvidia/parakeet-tdt-0.6b-v2 --in {input_path} --out {output_path}"
      format: txt
      language: en
      timeout: 300

    whispercpp:
      type: command
      command: "whisper-cli -m ~/models/ggml-large-v3.bin -f {input_path} -otxt -of {output_dir}/transcript"
      format: txt

    sensevoice:
      type: command
      command: "sensevoice-cli {input_path} --json | tee {output_path}"
      format: json
```

これは、以前からある `HERMES_LOCAL_STT_COMMAND` の抜け道（組み込みの `local_command` の経路）を補うものです。シェルを介して動くコマンド型のプロバイダと違い、以前からある雛形は引数の並びに切り分けられ、暗黙にシェルとして解釈されることはありません。シェルで動く文字起こしのエンジンを**複数**持ちたいとき、`stt.provider` で選べる名前を付けたいとき、プロバイダごとの `language` / `model` / `timeout` が必要なときは `stt.providers.<name>` を使ってください。

#### STT の差し込み記号 {#stt-placeholders}

コマンドの雛形では、次の差し込み記号を使えます。Hermes は実行の直前にこれらを置き換え、置かれた文脈（引用なし／単引用符の中／二重引用符の中）に合わせてシェル用の引用を付けるので、空白を含むパスでも安全です。

| 差し込み記号       | 意味                                                              |
|-------------------|----------------------------------------------------------------------|
| `{input_path}`    | 入力の音声ファイルの絶対パス（元の場所のまま、読み取り専用） |
| `{output_path}`   | コマンドが書き起こしを書き出すべき絶対パス             |
| `{output_dir}`    | `{output_path}` の親ディレクトリ（whisper 系の道具に便利です）  |
| `{format}`        | 設定した出力の形式：`txt` / `json` / `srt` / `vtt`             |
| `{language}`      | 設定した言語コード（既定は `en`）                          |
| `{model}`         | `stt.providers.<name>.model`。未設定なら空                       |

かっこの文字そのものを書きたいときは `{{` と `}}` を使います（コマンドに JSON の断片を埋め込むときに便利です）。

#### 文字起こしの受け取り方 {#how-the-transcript-is-read-back}

コマンドが正常に終わったあと、次の順で読み取ります。

1. `{output_path}` があって中身が空でなければ → Hermes がそれを UTF-8 の文章として読みます。
2. そうでなく、コマンドが標準出力へ書いていれば → それを使います。
3. どちらもなければ → エラー：「Command STT provider wrote no output file and produced no stdout」。

おかげで、ファイルを書き出す CLI（`whisper-cli`、`parakeet-asr`）にも、書き起こしを標準出力へ流す curl 風の一行（`curl … | jq -r .text`）にも同じ仕組みを使えます。

`format: json` / `srt` / `vtt` の場合、Hermes はファイルの中身をそのまま `transcript` の項目として返します。JSON から `.text` を取り出すのは実行役の仕事ではありません。`format: txt` を設定するか、JSON は後の工程で処理してください。

#### STT のコマンド型プロバイダの任意の設定項目 {#stt-command-provider-optional-keys}

| 項目             | 既定 | 意味                                                                                              |
|-----------------|---------|------------------------------------------------------------------------------------------------------|
| `timeout`       | `300`   | 秒数。過ぎるとプロセスの一族ごと終了させます（Unix は `start_new_session`、Windows は `taskkill /T`）。     |
| `format`        | `txt`   | `txt` / `json` / `srt` / `vtt` のいずれか。`{output_path}` の拡張子を決めます。                       |
| `language`      | `en`    | `{language}` に渡されます。既定は `stt.language`、それもなければ `en` です。                                     |
| `model`         | 空   | `{model}` に渡されます。`transcribe_audio()` の `model=` 引数のほうが優先されます。                |

#### STT のコマンド型プロバイダの挙動についての補足 {#stt-command-provider-behavior-notes}

- **最初から入っている名前が必ず勝ちます。** `stt.providers.openai: type: command` と書いても、本物の OpenAI Whisper の処理は上書きされません。最初から入っている名前は、コマンド型のプロバイダを探す処理より先に切り分けられます。
- **プロセスの一族ごと片付けます。** `timeout` を超えたコマンドは、包んでいるシェルだけでなくプロセスの一族すべてが終了させられます。モデルの読み込みで子プロセスを増やすような長い音声認識の流れも、取りこぼしなく片付きます。
- **シェル用の引用は自動です。** `'…'` の中の差し込み記号には単引用符に耐える形の逃がし方が、`"…"` の中では `$`／`` ` ``／`"` の逃がし方が、引用の外では `shlex.quote` が適用されます。差し込み記号の値に自分で引用を付けないでください。

#### STT のコマンド型プロバイダの安全上の注意 {#stt-command-provider-security}

シェルのコマンドは Hermes と同じ利用者の権限で動き、ファイルシステムにも同じだけ手が届きます。`tts.providers.<name>: type: command` や `HERMES_LOCAL_STT_COMMAND` と同じ信頼の考え方です。信頼できる出どころのものだけを書いてください。

### Python プラグインのプロバイダ（STT） {#python-plugin-providers-stt}

最初から入っておらず、しかもシェルのコマンドでは書き表せない文字起こしエンジン（Python SDK が必要、OAuth で更新される認証、少しずつ届くストリーミングなど）は、`ctx.register_transcription_provider()` で Python のプラグインとして登録します。プラグインは、最初から入っている 8 つのプロバイダ（`local`、`local_command`、`groq`、`openai`、`mistral`、`xai`、`elevenlabs`、`deepinfra`）と `stt.providers.<name>: type: command` の仕組みと**並んで存在します**。最初から入っているものは自前の実装のままで、名前がぶつかれば必ず勝ちます。コマンド型のプロバイダは同じ名前のプラグインより優先されます（設定のほうが、入れたプラグインより手元に近いからです）。

#### どちらを選ぶか（STT） {#when-to-pick-which-stt}

| 使いたいものが…                                                 | 選ぶもの                                                              |
|--------------------------------------------------------------|------------------------------------------------------------------|
| 音声ファイルを受け取って文章を出す、シェルのコマンド 1 本 | `stt.providers.<name>: type: command`（Python は不要）        |
| 以前からある単発のコマンドの抜け道だけで十分        | 環境変数 `HERMES_LOCAL_STT_COMMAND`（引数の並びに切り分けられ、暗黙のシェルなし） |
| CLI のない Python SDK                                     | `register_transcription_provider()` のプラグイン                      |
| OAuth で更新する認証、少しずつ届くストリーミング、声の一覧の情報 | `register_transcription_provider()` のプラグイン                      |
| 最初から入っているもので足りる（`local`、`groq`、`openai` など）  | `stt.provider: <name>` を設定します。最初から入っているものは内側で処理されます               |

#### 解決の順番 {#resolution-order}

1. **`stt.provider` が最初から入っている名前** → 最初から入っている処理へ。**必ずこれが勝ちます。**
2. **`stt.provider` が `command:` を持つ `stt.providers.<name>` に一致** → コマンド型のプロバイダの実行役へ（[STT のコマンド型自作プロバイダ](#stt-custom-command-providers) を参照）。同じ名前のプラグインより優先されます。
3. **`stt.provider` がプラグインで登録された `TranscriptionProvider` に一致** → プラグインへ。
   - プラグインの `is_available()` が `False` を返す場合（資格情報や SDK がない場合）、どのプラグインかが分かる「使えません」のエラーが返ります。ありふれた「No STT provider available」ではありません。
   - そうでなければ、プラグインの `transcribe()` が `model`（公開されている `model=` 引数、なければ `stt.<provider>.model`）と `language`（`stt.<provider>.language`）を伴って呼ばれます。
4. **どれにも一致しない** → 「No STT provider available」のエラー。

#### プロバイダごとの設定の置き場所 {#per-provider-config-namespace}

プラグインは、自分の設定を `config.yaml` の `stt.<provider>` から読みます。最初から入っているものが `stt.openai.model` / `stt.mistral.model` を読むのと同じ形です。

```yaml
stt:
  provider: my-stt
  my-stt:
    model: whisper-large-v3
    language: ja          # forwarded as language= to transcribe()
    # any other plugin-specific keys go here; read them via your
    # own config.yaml access in __init__/is_available/transcribe
```

この節から渡されるのは `model` と `language` です。それ以外は、プラグインが自分で読めます。

#### 最小のプラグイン {#minimal-plugin}

これを `~/.hermes/plugins/my-stt/` に置きます。

`plugin.yaml`:
```yaml
name: my-stt
version: 0.1.0
description: "My custom Python STT backend"
```

`__init__.py`:
```python
from agent.transcription_provider import TranscriptionProvider

class MySTTProvider(TranscriptionProvider):
    @property
    def name(self) -> str:
        return "my-stt"  # what stt.provider matches against

    @property
    def display_name(self) -> str:
        return "My Custom STT"

    def is_available(self) -> bool:
        # Return False when credentials/deps are missing — picker skips
        # this row but the dispatcher still routes here on explicit config.
        import os
        return bool(os.environ.get("MY_STT_API_KEY"))

    def transcribe(self, file_path, *, model=None, language=None, **extra):
        # Return the standard transcribe envelope:
        #   {"success": bool, "transcript": str, "provider": str, "error": str}
        # Do NOT raise — convert exceptions to the error envelope so the
        # gateway/CLI caller sees a consistent shape on failure.
        try:
            import my_stt_sdk
            client = my_stt_sdk.Client()
            text = client.transcribe(open(file_path, "rb"))
            return {
                "success": True,
                "transcript": text,
                "provider": "my-stt",
            }
        except Exception as exc:
            return {
                "success": False,
                "transcript": "",
                "error": f"my-stt failed: {exc}",
                "provider": "my-stt",
            }

def register(ctx):
    ctx.register_transcription_provider(MySTTProvider())
```

有効にして（`hermes plugins enable my-stt`）、`config.yaml` に `stt.provider: my-stt` を書けば、音声メッセージの文字起こしがそのプラグインを通るようになります。

#### 任意の差し込み口 {#optional-hooks}

より深く組み合わせたい場合は、プロバイダのクラスで次を上書きします。

- `list_models()` → `{id, display, languages, max_audio_seconds}` の辞書の一覧を返します。
- `default_model()` → 利用者がモデルを指定しなかったときに使う名前を返します。
- `get_setup_schema()` → `{name, badge, tag, env_vars: [{key, prompt, url}]}` を返し、`hermes tools` / `hermes setup` の選択肢の行を作ります（文字起こし向けの選択肢の分類はまだ出ていません。この情報は、あとで使えるようにプラグインから渡せるようになっています）。

説明文まで含めた抽象基底クラスの全体は `agent/transcription_provider.py` にあります。
