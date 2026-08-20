---
title: "声で話す"
description: "Hermes Agent と声でやり取りする — CLI、Telegram、Discord（ダイレクトメッセージ、テキストチャンネル、ボイスチャンネル）"
upstream_path: user-guide/features/voice-mode.md
upstream_blob: 7b51cdbf61bfe87bfc87b31547dda9ed52a5cc01
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/voice-mode
---

# 声で話す {#voice-mode}

Hermes Agent は、CLI でもメッセージのやり取りをする場所でも、まるごと声で会話できます。マイクに向かって話しかけ、返事を声で聞き、Discord のボイスチャンネルではその場で会話が成り立ちます。

おすすめの設定や実際の使い方をひととおり追いたいときは、[Hermes を声で使う](/hermes/docs/guides/use-voice-mode-with-hermes/) を見てください。

手を使わずに対話を始めたい場合 — 「hey hermes」（や好きな言葉）と話しかけて CLI・TUI・デスクトップアプリで新しい音声対話を開く方法 — は [ウェイクワード](/hermes/docs/user-guide/features/wake-word/) をご覧ください。

## 前提 {#prerequisites}

声の機能を使う前に、次が揃っているか確かめてください。

1. **Hermes Agent が入っていること** — インストールスクリプトで入れます（[導入](/hermes/docs/getting-started/installation/) を参照）
2. **LLM の提供元が設定してあること** — `hermes model` を実行するか、使いたい提供元の資格情報を `~/.hermes/.env` に書きます
3. **基本の設定が動くこと** — 声を有効にする前に `hermes` を走らせ、文字でのやり取りに返事が返ることを確かめます

:::tip
`~/.hermes/` ディレクトリと既定の `config.yaml` は、初めて `hermes` を実行したときに自動で作られます。手で用意する必要があるのは、API キーを書く `~/.hermes/.env` だけです。
:::

:::tip Nous Portal なら両方まかなえる
[Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) の有料契約なら、LLM（手順2）**と** Tool Gateway 経由の OpenAI 読み上げの両方が付いてきます。OpenAI のキーを別に用意する必要はありません。入れたばかりの環境なら、`hermes setup --portal` の一手で両方まとめて設定できます。
:::

## 全体像 {#overview}

| 機能 | 使える場所 | 説明 |
|---------|----------|-------------|
| **対話しながら声で** | CLI | Ctrl+B で録音を始め、話し終わった無音をエージェントが自分で見つけて返事します |
| **声での自動返信** | Telegram、Discord | 文字の返事に添えて、読み上げた音声も送ります |
| **ボイスチャンネル** | Discord | ボットがボイスチャンネルに入り、話し声を聞き取って声で返します |

## 必要なもの {#requirements}

### Python のパッケージ {#python-packages}

```bash
# CLI voice mode (microphone + audio playback)
cd ~/.hermes/hermes-agent && uv pip install -e ".[voice]"

# Discord + Telegram messaging (includes discord.py[voice] for VC support)
cd ~/.hermes/hermes-agent && uv pip install -e ".[messaging]"

# Premium TTS (ElevenLabs)
cd ~/.hermes/hermes-agent && uv pip install -e ".[tts-premium]"

# Local TTS (NeuTTS, optional)
python -m pip install -U neutts[all]

# Everything at once
cd ~/.hermes/hermes-agent && uv pip install -e ".[all]"
```

| 追加指定 | パッケージ | 必要になる場面 |
|-------|----------|--------------|
| `voice` | `sounddevice`、`numpy` | CLI で声を使うとき |
| `messaging` | `discord.py[voice]`、`python-telegram-bot`、`aiohttp` | Discord と Telegram のボット |
| `tts-premium` | `elevenlabs` | 読み上げに ElevenLabs を使うとき |

手元で動く読み上げも選べます。`neutts` は `python -m pip install -U neutts[all]` で別に入れてください。初回の利用時にモデルが自動で落ちてきます。

:::info
`discord.py[voice]` を入れると、音声の暗号化に使う **PyNaCl** と **opus のバインディング**も一緒に入ります。Discord のボイスチャンネルを使うには必須です。
:::

### システム側で必要なもの {#system-dependencies}

```bash
# macOS
brew install portaudio ffmpeg opus
brew install espeak-ng   # for NeuTTS

# Ubuntu/Debian
sudo apt install portaudio19-dev ffmpeg libopus0
sudo apt install espeak-ng   # for NeuTTS
```

| 必要なもの | 役割 | 必要になる場面 |
|-----------|---------|--------------|
| **PortAudio** | マイクからの入力と音声の再生 | CLI で声を使うとき |
| **ffmpeg** | 音声形式の変換（MP3 → Opus、PCM → WAV） | どの環境でも |
| **Opus** | Discord の音声コーデック | Discord のボイスチャンネル |
| **espeak-ng** | 発音記号への変換を担う土台 | 手元で動かす NeuTTS |

### API キー {#api-keys}

`~/.hermes/.env` に書き足します。

```bash
# Speech-to-Text — local provider needs NO key at all
# pip install faster-whisper          # Free, runs locally, recommended
GROQ_API_KEY=your-key                 # Groq Whisper — fast, free tier (cloud)
VOICE_TOOLS_OPENAI_KEY=your-key       # OpenAI Whisper — paid (cloud)

# Text-to-Speech (optional — Edge TTS and NeuTTS work without any key)
ELEVENLABS_API_KEY=***           # ElevenLabs — premium quality
# VOICE_TOOLS_OPENAI_KEY above also enables OpenAI TTS
```

:::tip
`faster-whisper` が入っていれば、文字起こしについては **API キーなし**で声が使えます。モデル（`base` でおよそ 150 MB）は初回の利用時に自動で落ちてきます。
:::

---

## CLI で声を使う {#cli-voice-mode}

声は、**昔ながらの CLI**（`hermes chat`）でも **TUI**（`hermes --tui`）でも使えます。振る舞いはどちらも同じで、スラッシュコマンドも、無音を見つける仕組みも、文の途中から読み上げる仕組みも、幻聴の除去も変わりません。TUI ではこれに加えて、落ちたときの詳しいログが `~/.hermes/logs/` に送られます。珍しい音声環境で押しっぱなし録音が動かなかったときも、黙って消えるのではなくスタックトレースごと報告できます。

### さっそく動かす {#quick-start}

CLI を起動して、声を有効にします。

```bash
hermes                # Start the interactive CLI
```

そのうえで、CLI の中で次のコマンドを使います。

```
/voice          Toggle voice mode on/off
/voice on       Enable voice mode
/voice off      Disable voice mode
/voice tts      Toggle TTS output
/voice status   Show current state
```

### 動きかた {#how-it-works}

1. `hermes` で CLI を起動し、`/voice on` で声を有効にします
2. **Ctrl+B を押す** — ビープ音（880Hz）が鳴り、録音が始まります
3. **話す** — 入力の大きさが `● [▁▂▃▅▇▇▅▂] ❯` のように目に見えます
4. **話し終える** — 3秒の無音で録音が自動的に止まります
5. **ビープ音が2回**（660Hz）鳴り、録音が終わったことを知らせます
6. 音声が Whisper で文字に起こされ、エージェントに送られます
7. 読み上げが有効なら、返事が声で流れます
8. 録音が**自動でまた始まります** — キーを押さずにそのまま話しかけられます

この繰り返しは、録音中に **Ctrl+B** を押す（続けて話すのをやめる）か、3回続けて話し声が拾えなかったときに終わります。

:::tip
録音のキーは `~/.hermes/config.yaml` の `voice.record_key` で変えられます（既定値: `ctrl+b`）。
:::

### 無音の見つけかた {#silence-detection}

話し終わりは、2段構えの手順で判断します。

1. **話し始めの確認** — RMS のしきい値（200）を超える音が 0.3 秒以上続くのを待ちます。音節の合間の短い落ち込みは見逃します
2. **終わりの判断** — 話し始めが確認できたあと、3.0 秒の無音が続いた時点で切り上げます

15 秒たっても話し声がまったく拾えないときは、録音が自動で止まります。

`silence_threshold` と `silence_duration` はどちらも `config.yaml` で調整できます。録音の開始・終了のビープ音は `voice.beep_enabled: false` で消せます。

### 声で音声対話を終える {#ending-a-voice-chat-by-voice}

**「stop」**とだけ言えば、手を使わずに音声での会話を終えられます。一致の条件はわざと厳しくしてあり、発話まるごと（大文字小文字は区別せず、前後の句読点は無視）が設定した言葉と等しいときだけ反応します。おかげで「stop doing that and try X instead」はいつもどおりエージェントに届きます。言葉の一覧は `config.yaml` の `voice.stop_phrases` で変えられます（例: `["stop", "goodbye hermes"]`）。`[]` にすると無効になります。話し声が3回続けて拾えなかったときも、音声での会話はひとりでに終わります。

音声での会話の最中に、終わりの言葉をそのまま**打ち込んだ**場合も、どの場所（CLI、TUI、デスクトップ）でも同じように働きます。そのメッセージはエージェントに送られず、音声での会話を終わらせます。音声での会話をしていないときの「stop」は、ふつうのメッセージとして扱われます。

### 文の途中から読み上げる {#streaming-tts}

読み上げが有効なとき、エージェントは文章を作りながら**一文ずつ**声にしていきます。返事が全部できあがるまで待つ必要はありません。これは**どの読み上げの提供元でも**働きます。

1. 少しずつ届く文字を、ひとまとまりの文になるまで貯めます（最短 20 文字）
2. Markdown の装飾、絵文字、`<think>` のかたまりを取り除きます
3. 文ごとにその場で音声を流します。細切れの PCM を返す API を持つ提供元（ElevenLabs、OpenAI）は生の音声を流し込み、最初のひと言までが最も速くなります。それ以外の提供元（既定の Edge を含む）は、文ができあがるたびに音声を作って流します

この流れは、昔ながらの CLI でも TUI でもデスクトップアプリでも同じです。デスクトップでの音声会話では、返事の文字がモデルの生成に合わせて**その場で**返事ごとの読み上げ用 WebSocket に流し込まれ、生成と発話が重なります。返事1つにつき接続と音の時計はそれぞれ1つずつなので、文ごとに接続が途切れることもありません。

### 話に割り込む {#barge-in}

エージェントの発話には**どの時点でも**割り込めます。こちらが話し終えた瞬間から返事が流れ終わるまで、マイクは開いたままです（同時に話せます）。

- **考えている最中に口を挟む** — 続けて話すやり方のとき、LLM が文章を作っている間に（まだ音声が流れる前に）話しかけると、進行中の返事が中断され、口を挟んだ内容が次のメッセージになります。処理中に文字を打ち込んだときと同じ扱いです。
- **かぶせて話す** — エージェントの返事が流れている最中に話し始めると、その瞬間に再生が止まり、話した内容が送られます。判定に使う雑音の基準は、発話が始まる時点の*静かな部屋*に合わせて取られます（流れている音声そのものではありません）。だからスピーカーの音に耳をふさがれることがなく、ふつうの話し声でしっかり反応します。
- **打ち込むか、録音キーを押す** — 新しいメッセージを送るか、押しっぱなし録音のキーを叩けば、どの場所でも再生がすぐ止まります。
- **「stop」と言う** — 終わりの言葉はどちらの段階でも効きます。文章を作っている最中なら発話を中断したうえで音声での会話を終わらせ、再生中なら読み上げを止めて会話を終わらせます。

調整（config.yaml）: `voice.barge_in: false` で割り込みを無効にできます。`voice.barge_in_threshold_multiplier`（既定値 `3.0`）は静かな部屋の基準に対して反応の敷居を何倍にするかを決めます。`voice.barge_in_grace_seconds`（既定値 `0.5`）は再生が始まった直後の誤反応を抑えます。`HERMES_VOICE_DEBUG=1` を設定すると、ブロックごとの判定の様子（基準の値、RMS、反応したかどうか）が標準エラー出力に流れ、その場で調整できます。

エージェントは、割り込まれたことを**ちゃんと分かっています**。次のメッセージに、声での返事が途中で切られた旨の短い注記が添えられるので、素知らぬ顔をせず自然に反応したり（「ひどい！」）、続きから話し直したりできます。

### 幻聴の除去 {#hallucination-filter}

Whisper は、無音や物音から実在しない文字（「Thank you for watching」「Subscribe」など）を作ってしまうことがあります。エージェントは、複数の言語にまたがる 26 個の既知の幻聴フレーズと、その言い回しの揺れを拾う正規表現で、こうした文字を取り除きます。

---

## 声での返信（Telegram と Discord） {#gateway-voice-reply-telegram-discord}

メッセージ用のボットをまだ用意していない場合は、それぞれの手引きを見てください。

- [Telegram の設定手引き](/hermes/docs/user-guide/messaging/telegram/)
- [Discord の設定手引き](/hermes/docs/user-guide/messaging/discord/)

窓口を起動して、メッセージのやり取りをする場所につなぎます。

```bash
hermes gateway        # Start the gateway (connects to configured platforms)
hermes gateway setup  # Interactive setup wizard for first-time configuration
```

### Discord: チャンネルとダイレクトメッセージ {#discord-channels-vs-dms}

Discord では、ボットとのやり取りに2つのやり方があります。

| やり方 | 話しかけかた | メンションの要否 | 準備 |
|------|------------|-----------------|-------|
| **ダイレクトメッセージ（DM）** | ボットのプロフィールを開く →「メッセージ」 | 不要 | すぐ使えます |
| **サーバーのチャンネル** | ボットがいるテキストチャンネルで打ち込む | 必要（`@botname`） | ボットをサーバーに招く必要があります |

**ダイレクトメッセージ（ひとりで使うならこちら）:** ボットとの DM を開いて打ち込むだけです。@メンションは要りません。声での返信もコマンドも、チャンネルと同じように働きます。

**サーバーのチャンネル:** ボットは @メンションされたときだけ返事します（例: `@hermesbyt4 hello`）。メンションの候補からは、同じ名前のロールではなく**ボットのユーザー**を選んでください。

:::tip
サーバーのチャンネルでメンションを不要にするには、`~/.hermes/.env` に次を足します。
```bash
DISCORD_REQUIRE_MENTION=false
```
特定のチャンネルだけメンション不要にすることもできます。
```bash
DISCORD_FREE_RESPONSE_CHANNELS=123456789,987654321
```
:::

### コマンド {#commands}

次は Telegram と Discord のどちらでも（DM でもテキストチャンネルでも）使えます。

```
/voice          Toggle voice mode on/off
/voice on       Voice replies only when you send a voice message
/voice tts      Voice replies for ALL messages
/voice off      Disable voice replies
/voice status   Show current setting
```

### 動きかたの種類 {#modes}

| 種類 | コマンド | 振る舞い |
|------|---------|----------|
| `off` | `/voice off` | 文字だけ（既定） |
| `voice_only` | `/voice on` | 音声メッセージを送ったときだけ返事を読み上げます |
| `all` | `/voice tts` | どのメッセージにも返事を読み上げます |

この設定は、窓口を再起動しても残ります。

### 場所ごとの届きかた {#platform-delivery}

| 場所 | 形式 | 備考 |
|----------|--------|-------|
| **Telegram** | 音声メッセージ（Opus/OGG） | 会話の中でそのまま再生されます。必要なら ffmpeg が MP3 を Opus に変換します |
| **Discord** | 本来の音声メッセージ（Opus/OGG） | 人が送った音声メッセージと同じように再生されます。音声メッセージの API が失敗した場合はファイル添付に切り替わります |

---

## Discord のボイスチャンネル {#discord-voice-channels}

いちばん入り込める使い方です。ボットが Discord のボイスチャンネルに入り、話している人の声を聞き取り、文字に起こし、エージェントの処理を通し、その返事をボイスチャンネルで声にして返します。

### 準備 {#setup}

#### 1. Discord ボットの権限 {#1-discord-bot-permissions}

文字のやり取り用に Discord ボットをすでに用意している場合（[Discord の設定手引き](/hermes/docs/user-guide/messaging/discord/) を参照）、音声用の権限を足す必要があります。

[Discord Developer Portal](https://discord.com/developers/applications) → 自分のアプリケーション → **Installation** → **Default Install Settings** → **Guild Install** と進みます。

**文字用の権限に、次を追加します。**

| 権限 | 役割 | 必須かどうか |
|-----------|---------|----------|
| **Connect** | ボイスチャンネルに入る | 必須 |
| **Speak** | ボイスチャンネルで読み上げた音声を流す | 必須 |
| **Use Voice Activity** | 誰かが話しているのを検知する | 推奨 |

**更新後の権限の数値:**

| 段階 | 数値 | 含まれるもの |
|-------|---------|----------------|
| 文字のみ | `309237763136` | チャンネルの閲覧、メッセージの送信、履歴の閲覧、埋め込み、添付、スレッド、リアクション、公開スレッドの作成 |
| 文字＋音声 | `309240908864` | 上記すべて＋ Connect、Speak |

更新した権限の URL で**ボットを招き直します**。

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=309240908864
```

`YOUR_APP_ID` は、Developer Portal にある自分の Application ID に置き換えてください。

:::warning
すでにボットがいるサーバーに招き直しても、ボットが抜けることはなく権限だけが更新されます。データや設定が失われることはありません。
:::

#### 2. 特権が要る Gateway Intents {#2-privileged-gateway-intents}

[Developer Portal](https://discord.com/developers/applications) → 自分のアプリケーション → **Bot** → **Privileged Gateway Intents** で、3つとも有効にします。

| Intent | 役割 |
|--------|---------|
| **Presence Intent** | 利用者がオンラインかどうかを検知する |
| **Server Members Intent** | `DISCORD_ALLOWED_USERS` のユーザー名を数値の ID に解決する（条件つき） |
| **Message Content Intent** | チャンネルの文字メッセージの中身を読む |

**Message Content Intent** は必須です。**Server Members Intent** が要るのは `DISCORD_ALLOWED_USERS` にユーザー名を書いた場合だけで、数値のユーザー ID を使っているなら切ったままで構いません。ボイスチャンネルでの SSRC → user_id の対応づけは、音声用 websocket に流れる Discord の SPEAKING オペコードから取れるので、Server Members Intent は**要りません**。

#### 3. Opus コーデック {#3-opus-codec}

窓口を動かす端末には、Opus コーデックのライブラリを入れておく必要があります。

```bash
# macOS (Homebrew)
brew install opus

# Ubuntu/Debian
sudo apt install libopus0
```

ボットは次の場所からコーデックを自動で読み込みます。

- **macOS:** `/opt/homebrew/lib/libopus.dylib`
- **Linux:** `libopus.so.0`

#### 4. 環境変数 {#4-environment-variables}

```bash
# ~/.hermes/.env

# Discord bot (already configured for text)
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ALLOWED_USERS=your-user-id

# STT — local provider needs no key (pip install faster-whisper)
# GROQ_API_KEY=your-key            # Alternative: cloud-based, fast, free tier

# TTS — optional. Edge TTS and NeuTTS need no key.
# ELEVENLABS_API_KEY=***      # Premium quality
# VOICE_TOOLS_OPENAI_KEY=***  # OpenAI TTS / Whisper
```

### 窓口を起動する {#start-the-gateway}

```bash
hermes gateway        # Start with existing configuration
```

数秒のうちに、Discord でボットがオンラインになるはずです。

### コマンド {#commands}

ボットがいる Discord のテキストチャンネルで使います。

```
/voice join      Bot joins your current voice channel
/voice channel   Alias for /voice join
/voice leave     Bot disconnects from voice channel
/voice status    Show voice mode and connected channel
```

:::info
`/voice join` を実行する前に、自分がボイスチャンネルに入っている必要があります。ボットは、あなたがいるのと同じボイスチャンネルに入ります。
:::

### 動きかた {#how-it-works}

ボットはボイスチャンネルに入ると、次のように動きます。

1. 参加者それぞれの音声を**別々に聞き取ります**
2. **無音を見つけます** — 0.5 秒以上の発話のあと 1.5 秒の無音が続くと処理を始めます
3. Whisper の文字起こし（手元、Groq、OpenAI のいずれか）で**文字に起こします**
4. エージェントの流れ（対話、ツール、記憶）を**まるごと通します**
5. 読み上げを通して、返事をボイスチャンネルで**声にします**

### テキストチャンネルとのつながり {#text-channel-integration}

ボットがボイスチャンネルにいる間は、次のようになります。

- 文字起こしがテキストチャンネルに出ます: `[Voice] @user: what you said`
- エージェントの返事は、チャンネルに文字で送られると同時にボイスチャンネルで読み上げられます
- 対象のテキストチャンネルは、`/voice join` を実行した場所です

### 自分の声を拾わない仕組み {#echo-prevention}

ボットは、読み上げた返事を流している間は聞き取りを自動で止めます。自分の出した音を聞き取って処理し直してしまうのを防ぐためです。

### 誰が使えるか {#access-control}

声でやり取りできるのは、`DISCORD_ALLOWED_USERS` に並んだ人だけです。それ以外の人の音声は、そのまま無視されます。

```bash
# ~/.hermes/.env
DISCORD_ALLOWED_USERS=284102345871466496
```

---

## 設定の早見表 {#configuration-reference}

### config.yaml {#configyaml}

```yaml
# Voice recording (CLI)
voice:
  record_key: "ctrl+b"            # Key to start/stop recording
  max_recording_seconds: 120       # Maximum recording length
  auto_tts: false                  # Auto-enable TTS when voice mode starts
  beep_enabled: true               # Play record start/stop beeps
  silence_threshold: 200           # RMS level (0-32767) below which counts as silence
  silence_duration: 3.0            # Seconds of silence before auto-stop
  stop_phrases: ["stop"]           # Saying exactly one of these ends the voice chat; [] disables

# Speech-to-Text
stt:
  enabled: true                     # set to false to skip auto-transcription —
                                    # the gateway still caches the audio file and
                                    # passes its path to the agent as part of the
                                    # inbound message, useful for custom pipelines
                                    # (diarization, alignment, archival, etc.)
  provider: "local"                  # "local" (free) | "groq" | "openai" | "mistral" | "xai"
  local:
    model: "base"                    # tiny, base, small, medium, large-v3
    language: ""                     # optional ISO-639-1 hint; blank = use HERMES_LOCAL_STT_LANGUAGE if set, else auto-detect
  groq:
    language: ""                     # optional ISO-639-1 hint; blank = use HERMES_LOCAL_STT_LANGUAGE if set, else auto-detect
  # model: "whisper-1"              # Legacy: used when provider is not set

# Text-to-Speech
tts:
  provider: "edge"                 # "edge" (free) | "elevenlabs" | "openai" | "neutts" | "minimax" | "mistral" | "gemini" | "xai" | "kittentts" | "piper"
  edge:
    voice: "en-US-AriaNeural"      # 322 voices, 74 languages
  elevenlabs:
    voice_id: "pNInz6obpgDQGcFmaJgB"    # Adam
    model_id: "eleven_multilingual_v2"
  openai:
    model: "gpt-4o-mini-tts"
    voice: "alloy"                 # alloy, echo, fable, onyx, nova, shimmer
    base_url: "https://api.openai.com/v1"  # optional: override for self-hosted or OpenAI-compatible endpoints
    # The `text_to_speech` tool accepts an optional per-call `instructions`
    # argument (tone, emotion, pacing, accent, whispering) that is forwarded
    # to `gpt-4o-mini-tts` and to OpenAI-compatible voice-design servers
    # (e.g. Qwen3-TTS-VoiceDesign via oMLX). See OpenAI's voice-design guide:
    # https://platform.openai.com/docs/guides/text-to-speech
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
```

### 環境変数 {#environment-variables}

```bash
# Speech-to-Text providers (local needs no key)
# pip install faster-whisper        # Free local STT — no API key needed
GROQ_API_KEY=...                    # Groq Whisper (fast, free tier)
VOICE_TOOLS_OPENAI_KEY=...         # OpenAI Whisper (paid)

# STT advanced overrides (optional)
STT_GROQ_MODEL=whisper-large-v3-turbo    # Override default Groq STT model
STT_OPENAI_MODEL=whisper-1               # Override default OpenAI STT model
GROQ_BASE_URL=https://api.groq.com/openai/v1     # Custom Groq endpoint
STT_OPENAI_BASE_URL=https://api.openai.com/v1    # Custom OpenAI STT endpoint

# Text-to-Speech providers (Edge TTS and NeuTTS need no key)
ELEVENLABS_API_KEY=***             # ElevenLabs (premium quality)
# VOICE_TOOLS_OPENAI_KEY above also enables OpenAI TTS

# Discord voice channel
DISCORD_BOT_TOKEN=...
DISCORD_ALLOWED_USERS=...
```

### 文字起こしの提供元くらべ {#stt-provider-comparison}

| 提供元 | モデル | 速さ | 品質 | 費用 | API キー |
|----------|-------|-------|---------|------|---------|
| **手元** | `base` | 速い（CPU/GPU 次第） | 良い | 無料 | 不要 |
| **手元** | `small` | ふつう | より良い | 無料 | 不要 |
| **手元** | `large-v3` | 遅い | 最も良い | 無料 | 不要 |
| **Groq** | `whisper-large-v3-turbo` | とても速い（約 0.5 秒） | 良い | 無料枠あり | 必要 |
| **Groq** | `whisper-large-v3` | 速い（約 1 秒） | より良い | 無料枠あり | 必要 |
| **OpenAI** | `whisper-1` | 速い（約 1 秒） | 良い | 有料 | 必要 |
| **OpenAI** | `gpt-4o-transcribe` | ふつう（約 2 秒） | 最も良い | 有料 | 必要 |
| **OpenAI** | `gpt-transcribe` | 速い | 最も良い | 有料（1分 $0.0045） | 必要 |
| **Mistral** | `voxtral-mini-latest` | 速い | 良い | 有料 | 必要 |
| **xAI** | `grok-stt` | 速い | 良い | 有料 | 必要 |

自動で切り替わるときの優先順位: **local** > **groq** > **openai**

### 読み上げの提供元くらべ {#tts-provider-comparison}

| 提供元 | 品質 | 費用 | 遅れ | キーの要否 |
|----------|---------|------|---------|-------------|
| **Edge TTS** | 良い | 無料 | 約 1 秒 | 不要 |
| **ElevenLabs** | 抜群 | 有料 | 約 2 秒 | 必要 |
| **OpenAI TTS** | 良い | 有料 | 約 1.5 秒 | 必要 |
| **NeuTTS** | 良い | 無料 | CPU/GPU 次第 | 不要 |

NeuTTS は、上の設定にある `tts.neutts` のかたまりを使います。

`openai` では、`text_to_speech` ツールに `instructions` という省略できる引数を渡せます。これを使うと `gpt-4o-mini-tts` の声づくり（口調、感情、間の取り方、なまり、ささやき）が引き出せます。同じ項目は、`tts.openai.base_url` でつないだ OpenAI 互換の声づくりサーバー（oMLX 経由の Qwen3-TTS-VoiceDesign など）にもそのまま渡ります。

---

## うまくいかないとき {#troubleshooting}

### 「No audio device found」（CLI） {#no-audio-device-found-cli}

PortAudio が入っていません。

```bash
brew install portaudio    # macOS
sudo apt install portaudio19-dev  # Ubuntu
```

Linux デスクトップの Docker の中で Hermes を動かしている場合は、コンテナから手元の音声ソケットにも届くようにする必要があります。PulseAudio や PipeWire に合わせた設定は [Docker の音声の橋渡し](/hermes/docs/user-guide/docker/#optional-linux-desktop-audio-bridge) の説明を見てください。

### Discord のサーバーのチャンネルでボットが返事しない {#bot-doesnt-respond-in-discord-server-channels}

サーバーのチャンネルでは、既定でボットへの @メンションが要ります。次を確かめてください。

1. `@` を打ったら、同じ名前の**ロール**ではなく（#付きの）**ボットのユーザー**を選ぶ
2. または DM を使う — メンションは要りません
3. または `~/.hermes/.env` に `DISCORD_REQUIRE_MENTION=false` を設定する

### ボイスチャンネルに入るのに声が届かない {#bot-joins-vc-but-doesnt-hear-me}

- 自分の Discord ユーザー ID が `DISCORD_ALLOWED_USERS` に入っているか確かめてください
- Discord でミュートになっていないか確かめてください
- ボットは音声を誰のものか対応づけるために Discord からの SPEAKING イベントを待ちます。入ってから数秒のうちに話し始めてください

### 声は届くのに返事がない {#bot-hears-me-but-doesnt-respond}

- 文字起こしが使えるか確かめます。`faster-whisper` を入れる（キー不要）か、`GROQ_API_KEY` / `VOICE_TOOLS_OPENAI_KEY` を設定します
- LLM のモデルが設定してあり、つながるか確かめます
- 窓口のログを見ます: `tail -f ~/.hermes/logs/gateway.log`

### 文字では返すのにボイスチャンネルで喋らない {#bot-responds-in-text-but-not-in-voice-channel}

- 読み上げの提供元が失敗しているかもしれません。API キーと残量を確かめてください
- 既定の逃げ道は Edge TTS（無料、キー不要）です
- ログに読み上げのエラーが出ていないか見てください

### Whisper がでたらめな文字を返す {#whisper-returns-garbage-text}

たいていは幻聴の除去が自動で拾います。それでも実在しない文字起こしが出るときは、次を試してください。

- もっと静かな場所で使う
- 設定の `silence_threshold` を調整する（大きくするほど鈍くなります）
- 別の文字起こしモデルを試す
