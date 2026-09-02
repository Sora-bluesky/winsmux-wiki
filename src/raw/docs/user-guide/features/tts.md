---
title: "音声と読み上げ"
description: "どのプラットフォームでも使える、文章の読み上げと音声メッセージの文字起こし"
upstream_path: user-guide/features/tts.md
upstream_blob: e2ae021a81a391c20f1face118f5e062e7dcc3cd
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/tts
---

# 音声と読み上げ {#voice-tts}

Hermes Agent は、どのメッセージングのプラットフォームでも、文章の読み上げと音声メッセージの文字起こしの両方に対応しています。

:::tip Nous の購読者の方へ
有料の [Nous Portal](https://portal.nousresearch.com) を購読していれば、OpenAI の読み上げを、別途 OpenAI の API キーを用意しなくても **[ツールゲートウェイ](/hermes/docs/user-guide/features/tool-gateway/)** から使えます。新しく入れる場合は `hermes setup --portal` でログインすれば、ゲートウェイのツールをまとめて有効にできます。すでに入れてある場合は、読み上げだけを **Nous Subscription** にすることもできて、`hermes model` か `hermes tools` から選べます。
:::

## 文章の読み上げ {#text-to-speech}

11 の提供元で、文章を音声に変えられます。

| 提供元 | 品質 | 費用 | API キー |
|----------|---------|------|---------|
| **Edge TTS**（既定） | 良い | 無料 | 不要 |
| **ElevenLabs** | とても良い | 有料 | `ELEVENLABS_API_KEY` |
| **OpenAI TTS** | 良い | 有料 | `VOICE_TOOLS_OPENAI_KEY` |
| **MiniMax TTS** | とても良い | 有料 | `MINIMAX_API_KEY` または `MINIMAX_CN_API_KEY` |
| **Mistral（Voxtral TTS）** | とても良い | 有料 | `MISTRAL_API_KEY` |
| **Google Gemini TTS** | とても良い | 無料枠あり | `GEMINI_API_KEY` |
| **xAI TTS** | とても良い | 有料 | `XAI_API_KEY` |
| **DeepInfra TTS** | 良い | 有料 | `DEEPINFRA_API_KEY` |
| **NeuTTS** | 良い | 無料（手元で動きます） | 不要 |
| **KittenTTS** | 良い | 無料（手元で動きます） | 不要 |
| **Piper** | 良い | 無料（手元で動きます） | 不要 |

### プラットフォームごとの届き方 {#platform-delivery}

| プラットフォーム | 届き方 | 形式 |
|----------|----------|--------|
| Telegram | ボイスの吹き出し（その場で再生されます） | Opus `.ogg` |
| Discord | ボイスの吹き出し（Opus/OGG）。だめならファイル添付になります | Opus/MP3 |
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

MiniMax TTS は、地域とエンドポイントと資格情報を組にして選びます。

- `region: "global"` は `https://api.minimax.io/v1/t2a_v2` を `MINIMAX_API_KEY` で使います。
- `region: "cn"` は `https://api.minimaxi.com/v1/t2a_v2` を `MINIMAX_CN_API_KEY` で使います。
- `region` を書かなかった場合は、これまでとの互換のため `MINIMAX_API_KEY` が優先されます。`MINIMAX_CN_API_KEY` だけを設定してあるときは `cn` が選ばれます。
- 地域をはっきり指定したなら、それに対応する資格情報が要ります。Hermes がもう一方の地域のキーを借りることはありません。`base_url` で上書きしても選ばれる資格情報は変わりませんし、もう一方の地域の公式エンドポイントを指す上書きは拒否されます。

**速さの調整**: 全体の `tts.speed` の値が、既定ではすべての提供元に効きます。提供元ごとに自前の `speed` で上書きもできます（たとえば `tts.openai.speed: 1.5`）。提供元ごとの速さが、全体の値より優先されます。既定は `1.0`（ふつうの速さ）です。

### Gemini の人物像プロンプト {#gemini-persona-prompts}

Gemini の読み上げは、ふだんの言葉で書いた演技の指示に従えます。`tts.gemini.persona_prompt_file` に、声の人物像を書いたローカルのマークダウンかテキストのファイルを指定してください。ファイルには `AUDIO PROFILE`、`SCENE`、`DIRECTOR'S NOTES`、`SAMPLE CONTEXT`、`TRANSCRIPT` といった Gemini 流の節を入れられます。

ファイルの中に `{transcript}` か `{{ transcript }}` があれば、Hermes がその場所を実際の読み上げ文に差し替えます。なければ、`TRANSCRIPT` という見出しの節を自動で末尾に足します。この人物像のプロンプトは手元にとどまり、チャットの返信には出ません。

```yaml
tts:
  provider: gemini
  gemini:
    voice: Algieba
    persona_prompt_file: ~/.hermes/tts/butler-voice.md
```

### 音声タグ（Gemini、xAI） {#audio-tags-gemini-xai}

Google の Gemini 3.1 Flash TTS と xAI の Grok TTS は、`[whispers]`、`[excitedly]`、`[very slow]`、`[laughs]` のような、角かっこで囲んだ自由な音声タグに対応しています。話し方の指示を書けるわけです。`tts.gemini.audio_tags` か `tts.xai.auto_speech_tags` を有効にすると、Hermes が読み上げの前に裏で書き換えの工程を挟みます。書き換えでタグが入るのは読み上げ用の原稿だけで、画面に見えるチャットの返信は変わりません。

```yaml
tts:
  provider: gemini
  gemini:
    model: gemini-3.1-flash-tts-preview
    audio_tags: true
  xai: 
    auto_speech_tags: true
```

書き換えには `auxiliary.tts_audio_tags` を使い、既定ではメインのチャットモデルになります。タグ入れをもっと安いモデルや速いモデルに任せたいなら、この補助タスクを上書きしてください。

**言語（OpenAI 互換のエンドポイント）**: `tts.openai.language` は `lang_code` というリクエストのパラメータとしてエンドポイントに渡されます。これは `lang_code` に対応した OpenAI 互換の読み上げサーバー向けの指定です。たとえば [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) では、`language: "es"` にすると既定の英語ではなくスペイン語の音素変換が選ばれます。公式の OpenAI API はこのパラメータを受け付けないので、そちらを使うときは未設定のままにしてください。未設定なら、余計なものは何も送られません。

### 入力の長さの上限 {#input-length-limits}

提供元ごとに、1 回のリクエストで送れる文字数の上限が決まっています。Hermes は長い返信を、文の切れ目を見ながら順序どおりの塊に分けてから提供元を呼びます。だから黙って切り捨てられることなく、整えられた文章がすべて残ります。

| 提供元 | 既定の上限（文字） |
|----------|---------------------|
| Edge TTS | 5000 |
| OpenAI | 4096 |
| xAI | 15000 |
| MiniMax | 10000 |
| Mistral | 4000 |
| Google Gemini | 32000 |
| ElevenLabs | モデルによります（下を参照） |
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
| 知らないモデル | 提供元の既定（10000）に落ちます |

読み上げの設定で、提供元の節の下に `max_text_length:` を書けば**提供元ごとに上書き**できます。

```yaml
tts:
  openai:
    max_text_length: 8192   # raise or lower the provider cap
```

効くのは正の整数だけです。0 や負の数、数値でないもの、真偽値は提供元の既定に落ちるので、設定を書き損じても提供元のリクエスト上限をうっかり越えることはありません。

### Telegram のボイスの吹き出しと ffmpeg {#telegram-voice-bubbles-ffmpeg}

Telegram のボイスの吹き出しには、Opus/OGG 形式の音声が要ります。

- **OpenAI、ElevenLabs、Mistral** はそのまま Opus を出すので、追加の準備は要りません
- **Edge TTS**（既定）は MP3 を出すので、変換に **ffmpeg** が要ります
- **MiniMax TTS** は MP3 を出すので、Telegram のボイスの吹き出しにするには **ffmpeg** での変換が要ります
- **Google Gemini TTS** は生の PCM を出し、**ffmpeg** で直接 Opus に変換して Telegram のボイスの吹き出しにします
- **xAI TTS** は MP3 を出すので、Telegram のボイスの吹き出しにするには **ffmpeg** での変換が要ります
- **NeuTTS** は WAV を出すので、こちらも Telegram のボイスの吹き出しには **ffmpeg** での変換が要ります
- **KittenTTS** は WAV を出すので、こちらも Telegram のボイスの吹き出しには **ffmpeg** での変換が要ります
- **Piper** は WAV を出すので、こちらも Telegram のボイスの吹き出しには **ffmpeg** での変換が要ります

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Fedora
sudo dnf install ffmpeg
```

ffmpeg がないと、Edge TTS、MiniMax TTS、NeuTTS、KittenTTS、Piper の音声はふつうの音声ファイルとして送られます（再生はできますが、ボイスの吹き出しではなく四角い再生バーで表示されます）。

:::tip
ffmpeg を入れずにボイスの吹き出しを使いたいなら、OpenAI、ElevenLabs、Mistral のいずれかに切り替えてください。
:::

### xAI のカスタムボイス（声の複製） {#xai-custom-voices-voice-cloning}

xAI は自分の声を複製して読み上げに使うことに対応しています。[xAI Console](https://console.x.ai/team/default/voice/voice-library) でカスタムボイスを作り、できあがった `voice_id` を設定に書いてください。

```yaml
tts:
  provider: xai
  xai:
    voice_id: "nlbqfwie"   # your custom voice ID
```

録音の仕方、対応する形式、制限については [xAI のカスタムボイスの解説](https://docs.x.ai/developers/model-capabilities/audio/custom-voices) を見てください。

### Piper（手元で動く、44 言語） {#piper-local-44-languages}

Piper は Open Home Foundation（Home Assistant を保守している団体）による、速くて手元で動くニューラル読み上げエンジンです。CPU だけで完結し、学習済みの声で **44 言語**に対応していて、API キーも要りません。

**`hermes tools` から入れられます** → Voice & TTS → Piper と進むと、Hermes が `pip install piper-tts` を代わりに実行します。手で入れるなら `pip install piper-tts` です。

**Piper に切り替える:**

```yaml
tts:
  provider: piper
  piper:
    voice: en_US-lessac-medium
```

手元にまだない声で初めて読み上げると、Hermes が `python -m piper.download_voices <name>` を実行して、モデル（品質の段階により 20〜90MB ほど）を `~/.hermes/cache/piper-voices/` に落とします。2 回目からは、そのモデルを使い回します。

**声の選び方。** [声の全一覧](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md) には英語、スペイン語、フランス語、ドイツ語、イタリア語、オランダ語、ポルトガル語、ロシア語、ポーランド語、トルコ語、中国語、アラビア語、ヒンディー語などがあり、それぞれ `x_low` / `low` / `medium` / `high` の品質の段階を持っています。声の見本は [rhasspy.github.io/piper-samples](https://rhasspy.github.io/piper-samples/) で聴けます。

**先に落としてある声を使う。** `tts.piper.voice` に `.onnx` で終わる絶対パスを書きます。

```yaml
tts:
  piper:
    voice: /path/to/my-custom-voice.onnx
```

**細かい調整**（`tts.piper.length_scale` / `noise_scale` / `noise_w_scale` / `volume` / `normalize_audio`、`use_cuda`）は、Piper の `SynthesisConfig` と一対一で対応します。古い `piper-tts` では無視されます。

### 音声の切り替えによる先読みと解放（手元で動くエンジン） {#warm-up-and-unload-via-speech-toggles-local-engines}

手元で動くエンジン（Piper、KittenTTS）はモデルを必要になってから読み込みます。そのままだと、音声を有効にしてから*最初の*返信でモデルの読み込みを丸ごと引き受けることになり、入れたばかりなら声のダウンロードまで待つことになって、最初のひと言までが無音になります。Hermes は音声出力の切り替えを「これから読み上げが要る」という合図として扱います。

- **デスクトップ** — **返信を読み上げる**を有効にしたり、**音声での会話**を始めたりすると、その場で設定済みのエンジンを裏で先に読み込みます。両方とも切ると、常駐していたモデルを解放します（Piper の声は数十 MB、KittenTTS は最大 80MB ほどあるので、無駄にメモリに置いたままにしません）。
- **CLI / TUI** — `/voice tts`（および `voice.auto_tts` を設定してあるときの `/voice on`）が同じことをします。`/voice off` で解放されます。

切り替えのそれぞれがエンジンの*使用権*を持ちます。モデルが解放されるのは、あらゆる画面にまたがる最後の使用権が手放されたときだけです。だから、あるデスクトップの窓で読み上げを切っても、別の窓で進んでいる会話から声を取り上げてしまうことはありません。クラウドの提供元には抱えておくモデルがないので、切り替えは必要になってから入る SDK（edge-tts、ElevenLabs、Mistral）があるかを確かめるだけです。先読みはできる範囲での話で、エンジンが読み込めなくても切り替え自体は成功し、最初の返信はこれまでどおりその場での読み込みに落ちます。

デスクトップは `POST /api/audio/tts-lease` を `{"lease": "<name>", "active": true|false}` で呼びます。ほかのフロントエンドも同じエンドポイントを使えます。

この使用権は利用者が自分で定義した提供元にも届くので、自前で立てた読み上げサーバーも切り替えに合わせてモデルを先読み・解放できます。[コマンド型の提供元](#custom-command-providers)なら任意の `warm_command` / `release_command` が走り、[Python プラグイン型の提供元](#python-plugin-providers)なら `warm()` / `release()` が呼ばれます。

### コマンド型の提供元を自作する {#custom-command-providers}

使いたい読み上げエンジンが最初から対応していないとき（VoxCPM、MLX-Kokoro、XTTS の CLI、声の複製スクリプト、そのほかコマンドを持つもの全般）でも、Python を書かずに**コマンド型の提供元**として組み込めます。Hermes は入力の文章を一時的な UTF-8 のファイルに書き、指定されたシェルのコマンドを実行して、そのコマンドが作った音声ファイルを読みます。

`tts.providers.<name>` の下に提供元を 1 つ以上宣言して、`tts.provider: <name>` で切り替えます。`edge` や `openai` といった最初からあるものを切り替えるのと同じやり方です。

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

**`output_format` に指定できる値:** `mp3`（既定）、`wav`、`ogg`、`flac`、`m4a`、`aac`、`amr`、`opus`。コマンドは実際にその形式を作らなければなりません（たとえば `ffmpeg` を使って）。Hermes は宣言された値を確かめて、出力ファイルにその名前を付けるだけです。知らない値なら `mp3` に落ちます。選ばれた形式は `{format}` という置き換え文字としてコマンドにも渡されます。

**子プロセスの環境:** コマンド型の提供元（読み上げも文字起こしも）は、Hermes の秘密の値を子プロセスの環境から取り除いた状態で走ります。ゲートウェイのボットのトークン、LLM の提供元の API キー、内部の中継用の資格情報は消され、`PATH`、`HOME`、ロケールといったふつうの変数は残ります。コマンドの雛形が環境から自前の API キーを必要とするなら（たとえば `curl` の一行コマンド）、提供元の設定の `env_passthrough` に変数名を並べてください。

```yaml
tts:
  providers:
    mycloud:
      type: command
      command: 'curl -s -H "Authorization: Bearer $MYCLOUD_API_KEY" ... -o {output_path}'
      env_passthrough: [MYCLOUD_API_KEY]
```

#### 例：Doubao（中国語の seed-tts-2.0） {#example-doubao-chinese-seed-tts-20}

ByteDance の [seed-tts-2.0](https://www.volcengine.com/docs/6561/1257544) の双方向ストリーミング API で品質の高い中国語の読み上げをするには、PyPI の [`doubao-speech`](https://pypi.org/project/doubao-speech/) を入れて、コマンド型の提供元として組み込みます。

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

資格情報はシェルの環境変数（`VOLCENGINE_APP_ID` / `VOLCENGINE_ACCESS_TOKEN`）か `~/.doubao-speech/config.yaml` から読まれます。声を選ぶには、コマンドに `--voice zh-female-warm`（あるいは `doubao-speech list-voices` に出るほかの別名）を足してください。`doubao-speech` にはストリーミングの音声認識も入っています。Hermes との組み合わせ方は[下の文字起こしの節](#example-doubao--volcengine-asr)を見てください。ソースと詳しい説明は [github.com/Hypnus-Yuan/doubao-speech](https://github.com/Hypnus-Yuan/doubao-speech) にあります。

#### 置き換え文字 {#placeholders}

コマンドの雛形では、次の置き換え文字を使えます。Hermes は組み立てのときにこれらを差し替え、前後の文脈（引用符なし／単引用符の中／二重引用符の中）に合わせて値をシェル用に引用します。空白などシェルで意味を持つ文字を含むパスでも安全です。

| 置き換え文字      | 意味                                              |
|------------------|------------------------------------------------------|
| `{input_path}`   | Hermes が書いた一時的な UTF-8 のテキストファイルのパス        |
| `{text_path}`    | `{input_path}` の別名                             |
| `{output_path}`  | コマンドが音声を書き込むべきパス                 |
| `{format}`       | `mp3` / `wav` / `ogg` / `flac`                       |
| `{voice}`        | `tts.providers.<name>.voice`。未設定なら空       |
| `{model}`        | `tts.providers.<name>.model`                         |
| `{speed}`        | 決まった速さの倍率（提供元ごと、または全体）       |

波かっこそのものを書きたいときは `{{` と `}}` を使います。

#### 任意で書けるキー {#optional-keys}

| キー                | 既定 | 意味                                                                                                    |
|--------------------|---------|------------------------------------------------------------------------------------------------------------|
| `timeout`          | `120`   | 何も起きない秒数です。標準出力か標準エラーに出力があると数え直します。動きがないまま過ぎるとプロセスの一群ごと終了させます（Unix は `killpg`、Windows は `taskkill /T`）。 |
| `output_format`    | `mp3`   | `mp3` / `wav` / `ogg` / `flac` のいずれか。Hermes がパスを決める場合は、出力の拡張子から自動で判断します。      |
| `voice_compatible` | `false` | `true` にすると、Hermes が MP3/WAV の出力を ffmpeg で Opus/OGG に変換し、Telegram でボイスの吹き出しになるようにします。      |
| `max_text_length`  | `5000`  | コマンド 1 回あたりの入力文字数の上限です。これより長い文章は、順序どおりの塊に分けられます。                  |
| `voice` / `model`  | 空   | 置き換え文字の値としてコマンドに渡されるだけです。                                                           |
| `warm_command` / `release_command` | 未設定 | どこかの画面で音声出力が有効になったとき／あらゆる画面にまたがる最後の使用権が手放されたときに走るシェルのコマンドです。たとえば手元の読み上げサーバーを先読みさせる `curl -s localhost:5002/load?model={model}` と、その `unload` 版です。できる範囲での実行で、待たされることはありません。裏で走り、`timeout`、`env_passthrough`、`{voice}` / `{model}` / `{speed}` の置き換え文字は `command` と同じです。出力は捨てられ、失敗はデバッグの記録に残るだけです。 |

#### 動きについての注意 {#behavior-notes}

- **最初からある名前が必ず勝ちます。** `tts.providers.openai` を書いても、もとからある OpenAI の提供元を覆い隠すことはありません。だから利用者の設定が、最初からあるものを黙って置き換えてしまうことはありません。
- **既定ではファイルとして届きます。** コマンド型の提供元は、どのプラットフォームでもふつうの音声の添付として届けます。ボイスの吹き出しで届けたいときは、提供元ごとに `voice_compatible: true` を指定してください。
- **コマンドの失敗はエージェントまで届きます。** 終了コードが 0 でない、出力が空、時間切れ、のいずれでもエラーが返り、コマンドの標準エラーと標準出力も一緒に返ります。会話のなかでそのまま原因を追えます。
- **`command:` を書いてあれば `type: command` が既定です。** `type: command` をはっきり書くのは良い習慣ですが、必須ではありません。`command` の文字列が空でなければ、コマンド型の提供元として扱われます。
- **`{input_path}` と `{text_path}` はどちらでも同じです。** コマンドとして読みやすいほうを使ってください。

#### 安全について {#security}

コマンド型の提供元は、設定したシェルのコマンドを、その利用者の権限でそのまま実行します。Hermes は置き換え文字の値を引用し、設定された時間切れを守らせますが、コマンドの雛形そのものは信頼された手元の入力という扱いです。PATH に置いたシェルスクリプトと同じ気持ちで扱ってください。

### Python プラグイン型の提供元 {#python-plugin-providers}

シェルのコマンド 1 本では表せない読み上げエンジン（CLI のない Python の SDK、ストリーミング型のエンジン、声の一覧を返す API、OAuth で更新する認証など）は、`ctx.register_tts_provider()` で Python のプラグインとして登録します。プラグインは[コマンド型の提供元](#custom-command-providers)の仕組みを置き換えるものではなく、**並んで存在します**。自分のエンジンに合うほうを選んでください。

#### どちらを選ぶか {#when-to-pick-which}

| 使いたいものが… | 選ぶもの |
|---|---|
| ファイルか標準入力から文章を読み、ファイルか標準出力に音声を書く CLI 1 本 | **コマンド型**（Python は不要） |
| シェルのパイプでつないだ 2〜3 本の CLI | **コマンド型** |
| Python の SDK だけで、CLI がない | **プラグイン** |
| 生成の途中から少しずつ届けたいストリーミングのバイト列（生成中のボイスの吹き出し） | **プラグイン**（`stream()` を上書きします） |
| `hermes setup` が使う、声の一覧を返す API | **プラグイン**（`list_voices()` を上書きします） |
| OAuth の更新の流れ（固定のトークンではないもの） | **プラグイン** |

最初からあるものが必ず勝ち、コマンド型は同じ名前のプラグインより優先されます。だから、最初からあるもの以外のどんな名前でプラグインを登録しても、いまの設定を覆い隠す心配はありません。

#### 最小のプラグイン {#minimal-plugin}

次のものを `~/.hermes/plugins/my-tts/` に置きます。

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

これを有効にして（`hermes plugins enable my-tts`）、`tts.provider` をそこへ向ければ（`config.yaml` に `tts.provider: my-tts`）、`text_to_speech` ツールがプラグインを通るようになります。

#### 任意で足せるフック {#optional-hooks}

もっと深く組み込みたいときは、提供元のクラスで次を上書きします。

- `list_voices()` → `hermes tools` に出る `{id, display, language, gender, preview_url}` の辞書の一覧を返します。
- `list_models()` → `{id, display, languages, max_text_length}` の辞書の一覧を返します。
- `get_setup_schema()` → `{name, badge, tag, env_vars: [{key, prompt, url}]}` を返して、`hermes tools` / `hermes setup` の選択画面の行を作ります。これがなくてもプラグインは動きますが、選択画面での表示は最低限になります。
- `stream(text, *, voice, model, format, **extra)` → 少しずつ届けるための、音声のバイト列を返す反復子です（既定では `NotImplementedError` になります）。
- `voice_compatible` のプロパティ → 出力が Opus と互換で、ゲートウェイにボイスの吹き出しとして届けさせたいなら `True` にします（既定は `False` で、ふつうの音声の添付になります）。
- `warm()` / `release()` → 自分の提供元が `tts.provider` に設定されているあいだ、どこかの画面で音声出力が有効になったとき／あらゆる画面にまたがる最後の使用権が手放されたときに呼ばれます。手元のモデルサーバーの先読みや解放をここでどうぞ。どちらも既定では何もせず、例外はデバッグの記録に残るだけで切り替えを失敗させることはありません。

説明文まで含めた抽象基底クラスの全体は `agent/tts_provider.py` にあります。

## 音声メッセージの文字起こし（STT） {#voice-message-transcription-stt}

Telegram、Discord、WhatsApp、Slack、Signal に届いた音声メッセージは、自動で文字に起こされて、文章として会話に差し込まれます。エージェントからは、ふつうの文章として見えます。

| 提供元 | 品質 | 費用 | API キー |
|----------|---------|------|---------| 
| **手元の Whisper**（既定） | 良い | 無料 | 不要 |
| **Groq Whisper API** | 良い〜最良 | 無料枠あり | `GROQ_API_KEY` |
| **OpenAI Whisper API** | 良い〜最良 | 有料 | `VOICE_TOOLS_OPENAI_KEY` または `OPENAI_API_KEY` |

:::info 設定なしで動きます
`faster-whisper` が入っていれば、手元での文字起こしはそのまま動きます。それが使えないときは、よくある置き場所（`/opt/homebrew/bin` など）にある手元の `whisper` コマンドや、`HERMES_LOCAL_STT_COMMAND` で指定した自前のコマンドも使えます。
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

### 提供元ごとの詳しい話 {#provider-details}

**手元（faster-whisper）** — [faster-whisper](https://github.com/SYSTRAN/faster-whisper) を使って、Whisper を手元で動かします。既定では CPU を使い、GPU があればそちらを使います。モデルの大きさは次のとおりです。

| モデル | 大きさ | 速さ | 品質 |
|-------|------|-------|---------|
| `tiny` | 約 75 MB | 最速 | ほどほど |
| `base` | 約 150 MB | 速い | 良い（既定） |
| `small` | 約 500 MB | ふつう | より良い |
| `medium` | 約 1.5 GB | やや遅い | かなり良い |
| `large-v3` | 約 3 GB | 最も遅い | 最良 |

**Groq API** — `GROQ_API_KEY` が要ります。無料で使えるクラウドの文字起こしがほしいときの、良い受け皿になります。言語が分かっている音声なら、`stt.groq.language`（または全体に効く環境変数 `HERMES_LOCAL_STT_LANGUAGE`）を設定すると Whisper の自動判別を省けて、待ち時間が短くなります。

**OpenAI API** — まず `VOICE_TOOLS_OPENAI_KEY` を見て、なければ `OPENAI_API_KEY` に落ちます。`whisper-1`、`gpt-4o-mini-transcribe`、`gpt-4o-transcribe`、`gpt-transcribe` に対応します。

**Mistral API（Voxtral Transcribe）** — `MISTRAL_API_KEY` が要ります。Mistral の [Voxtral Transcribe](https://docs.mistral.ai/capabilities/audio/speech_to_text/) のモデルを使います。13 言語、話者の切り分け、単語ごとの時刻に対応します。`cd ~/.hermes/hermes-agent && uv pip install -e ".[mistral]"` で入れてください。

**xAI Grok STT** — `XAI_API_KEY` が要ります。`https://api.x.ai/v1/stt` に multipart/form-data で送ります。すでにチャットや読み上げで xAI を使っていて、API キーを 1 本にまとめたいなら良い選択です。自動判別の順番では Groq のあとになるので、確実に使いたいときは `stt.provider: xai` を明示してください。

**手元のコマンドを使う受け皿** — Hermes に手元の文字起こしコマンドを直接呼ばせたいなら `HERMES_LOCAL_STT_COMMAND` を設定します。コマンドの雛形では `{input_path}`、`{output_dir}`、`{language}`、`{model}` の置き換え文字を使えます。Hermes は組み立てた雛形を引数の並びに分解し、シェルを通さずに実行します。だから `|`、`>`、`&&`、`;` といった記号は、そのままの文字として引数に渡ります。コマンドは `{output_dir}` の下のどこかに `.txt` の文字起こしを書かなければなりません。

#### 例：Doubao / Volcengine の音声認識 {#example-doubao-volcengine-asr}

Doubao の読み上げで [`doubao-speech`](https://pypi.org/project/doubao-speech/) を使っているなら（[上](#example-doubao-chinese-seed-tts-20)を参照）、同じパッケージが手元コマンドの経路で音声から文字への変換も引き受けます。

```bash
pip install doubao-speech
export VOLCENGINE_APP_ID="your-app-id"
export VOLCENGINE_ACCESS_TOKEN="your-access-token"
export HERMES_LOCAL_STT_COMMAND='doubao-speech transcribe {input_path} --out {output_dir}/transcript.txt'
```

信頼できる手元の雛形で、どうしてもパイプやリダイレクトなどシェルの機能が必要なら、シェルをはっきり呼び出してください。動的なパスはシェルのプログラム部分の外に置き、位置引数として渡します。

```bash
export HERMES_LOCAL_STT_COMMAND='sh -c '\''whisper "$1" --output_format txt --output_dir "$2" | tee "$2/whisper.log"'\'' _ {input_path} {output_dir}'
```

Windows では代わりに `cmd /c` か PowerShell のラッパーをはっきり書きます。ラッパーを明示すれば、シェルによる解釈は設定した引数の並びの一部として自分で選んだものになり、手元の文字起こしの雛形すべてに暗黙で付いてくる性質ではなくなります。

```yaml
stt:
  provider: local_command
```

Hermes は届いた音声メッセージを `{input_path}` に書き、コマンドを実行して、`{output_dir}` の下にできた `.txt` を読みます。言語は Volcengine の bigmodel のエンドポイントが自動で判別します。

### うまくいかないときの動き {#fallback-behavior}

`stt.provider` を**はっきり選んである**とき（`hermes tools` などで `config.yaml` に書かれているとき）は、その選択が厳密に守られます。その提供元が動かせなければ、黙ってほかのエンジンに乗り換えるのではなく、はっきりしたエラー（`stt is configured to use <provider> (set via hermes tools), but <failure>. Run 'hermes tools' to change it.`）で文字起こしが失敗します。設定に書かれた `stt.provider: local` も、はっきりした選択として数えられます。

**一度も選んだことがない**ときは、Hermes が使えるものから自動で判別します。
- **手元の faster-whisper が使えない** → クラウドの提供元より先に、手元の `whisper` コマンドか `HERMES_LOCAL_STT_COMMAND` を試します
- **Groq のキーがない** → 飛ばして、次に使えるものへ
- **OpenAI のキーがない** → 飛ばして、次に使えるものへ
- **Mistral のキーか SDK がない** → 自動判別では飛ばし、次に使えるものへ落ちます
- **何も使えない** → 音声メッセージはそのまま素通りし、その旨が正確に伝えられます

### 文字起こしのコマンド型の提供元を自作する {#stt-custom-command-providers}

使いたい文字起こしのエンジンが最初から対応していないとき（Doubao の音声認識、NVIDIA Parakeet、自分でビルドした whisper.cpp、オープンソースの SenseVoice の CLI、そのほかシェルのコマンドを持つもの全般）でも、Python を書かずに**コマンド型の提供元**として組み込めます。Hermes は音声ファイルに対してコマンドを実行し、書き出された文字起こしを読み戻します。

`stt.providers.<name>` の下に提供元を 1 つ以上宣言して、`stt.provider: <name>` で切り替えます。読み上げの[コマンド型の提供元の仕組み](#custom-command-providers)と同じ形を、入力=音声 → 出力=文字起こし の向きに合わせたものです。

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

これは、最初からある `local_command` の経路を通る、以前からの `HERMES_LOCAL_STT_COMMAND` という逃げ道を補うものです。シェルで動くコマンド型の仕組みと違って、以前からの雛形は引数の並びに分解され、暗黙のシェル解釈なしに走ります。シェルで動く文字起こしのエンジンを**いくつも**持ちたいとき、`stt.provider` で選べる名前がほしいとき、提供元ごとの `language` / `model` / `timeout` が要るときは、`stt.providers.<name>` を使ってください。

#### 文字起こしの置き換え文字 {#stt-placeholders}

コマンドの雛形では、次の置き換え文字を使えます。Hermes は組み立てのときにこれらを差し替え、前後の文脈（引用符なし／単引用符の中／二重引用符の中）に合わせて値をシェル用に引用するので、空白を含むパスでも安全です。

| 置き換え文字       | 意味                                                              |
|-------------------|----------------------------------------------------------------------|
| `{input_path}`    | 入力する音声ファイルの絶対パス（もとの場所、読み取り専用） |
| `{output_path}`   | コマンドが文字起こしを書き込むべき絶対パス             |
| `{output_dir}`    | `{output_path}` の親ディレクトリ（whisper 系の道具で便利です）  |
| `{format}`        | 設定した出力形式: `txt` / `json` / `srt` / `vtt`             |
| `{language}`      | 設定した言語コード（既定は `en`）                          |
| `{model}`         | `stt.providers.<name>.model`。未設定なら空                       |

波かっこそのものを書きたいときは `{{` と `}}` を使います（コマンドに JSON の断片を埋め込むときに便利です）。

#### 文字起こしはどう読み戻されるか {#how-the-transcript-is-read-back}

コマンドが無事に終わったあと、次の順で読みます。

1. `{output_path}` があって中身が空でなければ → Hermes がそれを UTF-8 の文章として読みます。
2. そうでなく、コマンドが標準出力に書いていれば → それを使います。
3. どちらでもなければ → エラー「Command STT provider wrote no output file and produced no stdout」になります。

おかげで、ファイルを書く CLI（`whisper-cli`、`parakeet-asr`）にも、文字起こしを標準出力に出す curl 風の一行コマンド（`curl … | jq -r .text`）にも、この仕組みを使えます。

`format: json` / `srt` / `vtt` のときは、Hermes はファイルの中身をそのまま `transcript` の項目として返します。JSON から `.text` を取り出すのは、この実行部分の役目ではありません。`format: txt` を設定するか、JSON を後段で処理してください。

#### 文字起こしのコマンド型で任意に書けるキー {#stt-command-provider-optional-keys}

| キー             | 既定 | 意味                                                                                              |
|-----------------|---------|------------------------------------------------------------------------------------------------------|
| `timeout`       | `300`   | 秒数です。過ぎるとプロセスの一群ごと終了させます（Unix は `start_new_session`、Windows は `taskkill /T`）。     |
| `format`        | `txt`   | `txt` / `json` / `srt` / `vtt` のいずれか。`{output_path}` の拡張子を決めます。                       |
| `language`      | `en`    | `{language}` に渡されます。既定は `stt.language`、それもなければ `en` です。                                     |
| `model`         | 空   | `{model}` に渡されます。`transcribe_audio()` の `model=` 引数がこれを上書きします。                |

#### 文字起こしのコマンド型の動きについての注意 {#stt-command-provider-behavior-notes}

- **最初からある名前が必ず勝ちます。** `stt.providers.openai: type: command` と書いても、本物の OpenAI Whisper の処理を上書きすることはできません。最初からある名前は、コマンド型の解決が走る前に打ち切られます。
- **プロセスの一群ごと片づけます。** `timeout` を越えたコマンドは、シェルのラッパーだけでなくプロセスの一群がまるごと終了させられます。モデルの読み込みを子プロセスに分ける、長く走る音声認識の処理も確実に片づきます。
- **シェル用の引用は自動です。** `'…'` の中の置き換え文字は単引用符に安全な形に、`"…"` の中では `$` と `` ` `` と `"` を逃がす形に、引用符の外では `shlex.quote` で処理されます。置き換え文字の値をあらかじめ引用しないでください。

#### 文字起こしのコマンド型の安全について {#stt-command-provider-security}

シェルのコマンドは Hermes と同じ利用者の権限で、ファイルシステムに何の制限もなく走ります。`tts.providers.<name>: type: command` や `HERMES_LOCAL_STT_COMMAND` と同じ信頼の考え方です。信頼できる出どころのものだけを宣言してください。

### Python プラグイン型の提供元（文字起こし） {#python-plugin-providers-stt}

最初から対応しておらず、しかもシェルのコマンドでは表せない文字起こしのエンジン（Python の SDK が要る、OAuth で更新する認証、少しずつ届くデータなど）は、`ctx.register_transcription_provider()` で Python のプラグインとして登録します。プラグインは、最初からある 8 つの提供元（`local`、`local_command`、`groq`、`openai`、`mistral`、`xai`、`elevenlabs`、`deepinfra`）や `stt.providers.<name>: type: command` の仕組みと**並んで存在します**。最初からあるものは自前の実装を保ち、名前がぶつかれば必ず勝ちます。コマンド型は同じ名前のプラグインより優先されます（設定のほうが、プラグインを入れることより手元に近いからです）。

#### どちらを選ぶか（文字起こし） {#when-to-pick-which-stt}

| 使いたいものが…                                                 | 選ぶもの                                                              |
|--------------------------------------------------------------|------------------------------------------------------------------|
| 音声ファイルを受け取って文章を出す、シェルのコマンド 1 本 | `stt.providers.<name>: type: command`（Python は不要）        |
| 以前からの、コマンド 1 本の逃げ道だけでよい        | 環境変数 `HERMES_LOCAL_STT_COMMAND`（引数の並びに分解され、暗黙のシェルなし） |
| CLI のない Python の SDK                                     | `register_transcription_provider()` のプラグイン                      |
| OAuth で更新する認証、少しずつ届くデータ、声の一覧の情報 | `register_transcription_provider()` のプラグイン                      |
| 最初からあるもので足りる（`local`、`groq`、`openai` など）  | `stt.provider: <name>` を設定します。最初からあるものは内蔵です               |

#### 解決の順番 {#resolution-order}

1. **`stt.provider` が最初からある名前** → 最初からある処理へ。**必ず勝ちます。**
2. **`stt.provider` が `command:` を持つ `stt.providers.<name>` に一致** → コマンド型の実行へ（[文字起こしのコマンド型の提供元](#stt-custom-command-providers)を参照）。同じ名前のプラグインより優先されます。
3. **`stt.provider` がプラグインで登録された `TranscriptionProvider` に一致** → プラグインへ。
   - プラグインの `is_available()` が `False` を返す場合（資格情報か SDK が足りない）、そのプラグインを名指しした「使えません」というエラーが返ります。よくある「No STT provider available」というメッセージ**ではありません**。
   - そうでなければ、プラグインの `transcribe()` が `model`（公開されている `model=` の引数から。なければ `stt.<provider>.model`）と `language`（`stt.<provider>.language` から）とともに呼ばれます。
4. **どれにも一致しない** → 「No STT provider available」のエラーになります。

#### 提供元ごとの設定の置き場所 {#per-provider-config-namespace}

プラグインは提供元ごとの設定を `config.yaml` の `stt.<provider>` から読みます。最初からあるものが `stt.openai.model` / `stt.mistral.model` を読むのと同じ形です。

```yaml
stt:
  provider: my-stt
  my-stt:
    model: whisper-large-v3
    language: ja          # forwarded as language= to transcribe()
    # any other plugin-specific keys go here; read them via your
    # own config.yaml access in __init__/is_available/transcribe
```

この節から `model` と `language` は自動で渡されます。それ以外は、プラグインが自分で読めます。

#### 最小のプラグイン {#minimal-plugin}

次のものを `~/.hermes/plugins/my-stt/` に置きます。

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

これを有効にして（`hermes plugins enable my-stt`）、`config.yaml` に `stt.provider: my-stt` を書けば、音声メッセージの文字起こしがプラグインを通るようになります。

#### 任意で足せるフック {#optional-hooks}

もっと深く組み込みたいときは、提供元のクラスで次を上書きします。

- `list_models()` → `{id, display, languages, max_audio_seconds}` の辞書の一覧を返します。
- `default_model()` → 利用者がモデルを上書きしなかったときに返る文字列です。
- `get_setup_schema()` → `{name, badge, tag, env_vars: [{key, prompt, url}]}` を返して、`hermes tools` / `hermes setup` の選択画面の行を作ります（文字起こし向けの選択画面はまだ出ていません。この情報は、先を見越してプラグインが持てるようにしてあります）。

説明文まで含めた抽象基底クラスの全体は `agent/transcription_provider.py` にあります。
