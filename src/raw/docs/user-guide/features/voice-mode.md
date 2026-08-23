---
title: "音声モード"
description: "Hermes Agent とリアルタイムで音声のやりとりをする — CLI、Telegram、Discord（DM、テキストチャンネル、ボイスチャンネル）"
upstream_path: user-guide/features/voice-mode.md
upstream_blob: 349b8936d2eda0f5aa421cf4a9523219340ce28f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/voice-mode
---

# 音声モード {#voice-mode}

Hermes Agent は、CLI とメッセージ系のサービスの両方で音声のやりとりに対応しています。マイクで話しかけ、返事を音声で聞き、Discord のボイスチャンネルでは会話をそのまま続けられます。

推奨設定や実際の使い方を含む、手順に沿った導入の解説は [Hermes で音声モードを使う](/hermes/docs/guides/use-voice-mode-with-hermes/)をご覧ください。

手を使わずに会話を始めたい場合、つまり「hey hermes」（言葉は自由に決められます）と声をかけて CLI・TUI・デスクトップアプリで新しい音声セッションを開く方法は、[ウェイクワード](/hermes/docs/user-guide/features/wake-word/)をご覧ください。

## 前提 {#prerequisites}

音声機能を使う前に、次がそろっているか確認してください。

1. **Hermes Agent が導入済みであること** — インストールスクリプト経由（[インストール](/hermes/docs/getting-started/installation/)を参照）
2. **LLM の提供元が設定してあること** — `hermes model` を実行するか、使いたい提供元の資格情報を `~/.hermes/.env` に書きます
3. **基本の設定が動いていること** — 音声を有効にする前に `hermes` を実行し、文字のやりとりで返事が返ることを確かめます

:::tip
`~/.hermes/` ディレクトリと既定の `config.yaml` は、`hermes` を最初に実行したときに自動で作られます。手で作る必要があるのは、API キーを入れる `~/.hermes/.env` だけです。
:::

:::tip Nous Portal ならどちらもまかなえます
有料の [Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) 契約なら、LLM（手順2）**と** Tool Gateway 経由の OpenAI TTS の両方が使えます。OpenAI のキーを別に用意する必要はありません。新規に導入する場合は、`hermes setup --portal` が一度に両方を整えます。
:::

## 全体像 {#overview}

| 機能 | 使える場所 | 説明 |
|---------|----------|-------------|
| **対話型の音声** | CLI | Ctrl+B で録音を開始。話し終わりを自動で検出して返事をします |
| **自動の音声返信** | Telegram、Discord | 文字の返事と一緒に、読み上げた音声を送ります |
| **ボイスチャンネル** | Discord | ボットが通話に参加し、話し声を聞き取り、返事を声で返します |

## 必要なもの {#requirements}

### Python パッケージ {#python-packages}

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
|-------|----------|-------------|
| `voice` | `sounddevice`, `numpy` | CLI の音声モード |
| `messaging` | `discord.py[voice]`, `python-telegram-bot`, `aiohttp` | Discord と Telegram のボット |
| `tts-premium` | `elevenlabs` | ElevenLabs の TTS 提供元 |

手元で動かす TTS 提供元は任意です。`python -m pip install -U neutts[all]` で `neutts` を別途入れます。最初に使うときにモデルを自動で取得します。

:::info
`discord.py[voice]` は **PyNaCl**（音声の暗号化用）と **opus のバインディング**を自動で入れます。Discord のボイスチャンネルに対応するには、これが必要です。
:::

### システム側の依存 {#system-dependencies}

```bash
# macOS
brew install portaudio ffmpeg opus
brew install espeak-ng   # for NeuTTS

# Ubuntu/Debian
sudo apt install portaudio19-dev ffmpeg libopus0
sudo apt install espeak-ng   # for NeuTTS
```

| 依存 | 役割 | 必要になる場面 |
|-----------|---------|-------------|
| **PortAudio** | マイク入力と音声の再生 | CLI の音声モード |
| **ffmpeg** | 音声形式の変換（MP3 → Opus、PCM → WAV） | すべての環境 |
| **Opus** | Discord の音声コーデック | Discord のボイスチャンネル |
| **espeak-ng** | 発音記号への変換基盤 | 手元で動かす NeuTTS |

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
`faster-whisper` を入れてあれば、音声認識について **API キーなし**で音声モードが動きます。モデル（`base` でおよそ 150 MB）は最初に使うときに自動で取得されます。
:::

---

## CLI の音声モード {#cli-voice-mode}

音声モードは、従来の **CLI**（`hermes chat`）と **TUI**（`hermes --tui`）のどちらでも使えます。動きは同じで、スラッシュコマンドも、無音の検出も、逐次読み上げも、幻聴のような文字列を除く仕組みも変わりません。TUI ではさらに、異常終了時の詳しい記録を `~/.hermes/logs/` へ書き出します。珍しい音声基盤で押しながら話す機能が失敗したとき、黙って消えるのではなく、呼び出しの経路まで含めて報告できます。

### すぐに使い始める {#quick-start}

CLI を起動して音声モードを有効にします。

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

### 仕組み {#how-it-works}

1. `hermes` で CLI を起動し、`/voice on` で音声モードを有効にします
2. **Ctrl+B を押す** — 短い音（880Hz）が鳴り、録音が始まります
3. **話す** — 入力の大きさが `● [▁▂▃▅▇▇▅▂] ❯` のように表示されます
4. **話し終える** — 3秒間の無音で、録音が自動的に止まります
5. **2回の音**（660Hz）が鳴り、録音の終了を知らせます
6. 音声が Whisper で文字に起こされ、エージェントへ送られます
7. TTS が有効なら、エージェントの返事が読み上げられます
8. 録音が**自動で再開**します。キーを押さずにそのまま話せます

この繰り返しは、録音中に **Ctrl+B** を押す（続けて録音する状態を抜けます）か、3回続けて発話が検出されないまで続きます。

:::tip
録音に使うキーは、`~/.hermes/config.yaml` の `voice.record_key` で変えられます（既定は `ctrl+b`）。
:::

### 無音の検出 {#silence-detection}

2段階の判定で、話し終わりを見分けます。

1. **発話の確認** — RMS のしきい値（200）を超える音が 0.3 秒以上続くのを待ちます。音節のあいだの短い落ち込みは無視します
2. **終わりの判定** — 発話が確認できたあと、3.0 秒の無音が続いた時点で処理に移ります

まったく発話が検出されない場合は、15 秒で録音が自動的に止まります。

`silence_threshold` と `silence_duration` はどちらも `config.yaml` で変えられます。録音の開始・終了の音は `voice.beep_enabled: false` で消せます。

### 声で音声チャットを終える {#ending-a-voice-chat-by-voice}

**「stop」**とだけ言うと、手を使わずに音声での会話を終えられます。一致の判定はあえて厳しくしてあり、発話全体（大文字小文字は区別せず、前後の句読点は無視）が設定した言葉と一致する必要があります。そのため「stop doing that and try X instead」のような文は、これまでどおりエージェントに届きます。言葉の一覧は `config.yaml` の `voice.stop_phrases` で変えられます（例: `["stop", "goodbye hermes"]`）。`[]` にすると無効になります。音声チャットは、無音の周期が3回続いた場合（発話が検出されない場合）にも自動で終わります。

音声チャット中に終了の言葉だけを**入力した**場合も、どの画面（CLI、TUI、デスクトップ）でも同じ扱いになります。そのメッセージはエージェントへ送られず、音声チャットを終わらせます。音声チャットの外で入力した「stop」は、ふつうのメッセージです。

### 逐次読み上げ {#streaming-tts}

TTS が有効なとき、エージェントは文章を生成しながら**一文ずつ**返事を読み上げます。返事が出そろうのを待つ必要はありません。これは**すべての TTS 提供元**で動きます。

1. 文字の断片をためて、まとまった文（最短 20 文字）にします
2. Markdown の記法、絵文字、`<think>` のかたまりを取り除きます
3. 文ごとにその場で音を鳴らします。分割した PCM を扱える提供元（ElevenLabs、OpenAI）は生の音声をそのまま流し、最初の一語までがいちばん短くなります。それ以外の提供元（既定の Edge を含む）は、文ができあがるたびに合成して鳴らします

同じ流れが、従来の CLI、TUI、デスクトップアプリで動きます。デスクトップの音声会話では、モデルが返事を生成するそばから、その文章が返事ごとの読み上げ用 WebSocket へ**そのまま**流し込まれます。読み上げが生成に重なり、返事ごとに1つの接続と1つの音声の時計だけで進むので、文ごとに接続が途切れることはありません。

### デスクトップから離れた場所へつなぐ場合: クライアント直結の音声（経由地を最も少なくする道） {#desktop-remote-client-direct-voice-lowest-hop-path}

Hermes Desktop が**離れた場所のゲートウェイ**につながっているとき、音声をゲートウェイ経由で中継する必要はまったくありません。音声セッションの開始時に、デスクトップは認証済みの REST の窓口（`GET /api/audio/voice-config`）を通じて、いま使っているプロファイルの STT/TTS 設定（提供元、モデル、言語や声、資格情報）をゲートウェイから受け取り、そのうえで提供元を**直接**呼びます。

- **口述筆記・音声入力:** マイクの録音はデスクトップからプロファイルの STT 提供元へ直接届きます。ゲートウェイへ送られるのは、出来上がった*文字*だけです。
- **読み上げの返事:** 返事の文章はチャット用の接続を通じてすでにデスクトップへ流れているので、デスクトップはプロファイルの TTS 提供元で手元で合成して鳴らします。ゲートウェイとの経路に音声が乗ることはありません。

クライアント側で設定するものはありません。提供元とキーについては、話し相手になっているプロファイルが唯一の正本で、ゲートウェイが自分で処理した場合とまったく同じです。キーはセッションのあいだだけデスクトップのメモリに置かれ、クライアントのディスクへ書かれることはありません。

ゲートウェイを動かしている機械でしか動けない提供元（手元の whisper、`edge` の TTS、コマンド型の提供元、プラグイン）は、自動的に中継の道（`/api/audio/transcribe` と読み上げ用の WebSocket）に戻ります。この窓口を持たない古い基盤も同様です。すべての提供元で中継を使わせたい場合は、次のように設定します。

```yaml
voice:
  client_direct: false
```

クライアント直結に対応している通信の形は、OpenAI（Nous が管理する音声を含む）、Groq、Mistral、DeepInfra の OpenAI 互換の形、xAI Grok の STT、そして ElevenLabs の STT と TTS です。OAuth で設定した xAI は中継のままになります（OAuth の認証情報はサーバー側で更新されるためです）。

### 割り込み {#barge-in}

エージェントの応答中、どの時点でも割り込めます。話し終えた瞬間から返事の再生が終わるまで、マイクは開いたままです（同時に双方向）。

- **考えている最中に口を挟む** — 続けて話す音声モードでは、LLM が生成しているあいだ（まだ音が鳴っていないあいだ）に話すと、進行中の応答が中断され、割り込んだ内容が次のメッセージになります。実行中の応答に文字を打ち込んだときと同じです。
- **かぶせて話す** — エージェントの返事が鳴っているあいだに話すと、話し始めた瞬間に再生が止まり、話した内容が送られます。検出の仕組みは、応答の始まりにある*静かな部屋*を基準に雑音の水準を測ります（再生中の音を基準にはしません）。そのためスピーカーの音に耳をふさがれることがなく、ふつうの話し声で確実に反応します。
- **文字を打つ、または録音キーを押す** — 新しいメッセージを送るか、押しながら話すキーを押すと、どの画面でも再生がすぐ止まります。
- **「stop」と言う** — 終了の言葉は両方の段階で効きます。生成中なら応答を中断したうえで音声チャットを終わらせ、再生中なら読み上げを止めて会話を終わらせます。

調整（config.yaml）: `voice.barge_in: false` で無効になります。`voice.barge_in_threshold_multiplier`（既定は `3.0`）は、静かな部屋の水準に対する発話の反応しやすさを決めます。`voice.barge_in_grace_seconds`（既定は `0.5`）は、再生が始まった直後の誤反応を抑えます。`HERMES_VOICE_DEBUG=1` を設定すると、ブロックごとの発話検出の診断（測った基準値、RMS、反応の判断）が標準エラー出力へ流れ、その場で調整できます。

エージェントは割り込まれたことを**理解します**。次のメッセージに、読み上げていた返事が途中で切れたという短い注記が付くので、何も知らないまま進むのではなく、自然に反応したり（「失礼な！」）、続きから話し直したりできます。

### 幻聴のような文字列を除く仕組み {#hallucination-filter}

Whisper は、無音や周囲の雑音から、ありもしない文章（「Thank you for watching」「Subscribe」など）を作ってしまうことがあります。エージェントは、複数の言語にまたがる既知の 26 の言い回しと、繰り返しの変種を捉える正規表現で、これらを取り除きます。

---

## ゲートウェイ経由の音声返信（Telegram と Discord） {#gateway-voice-reply-telegram-discord}

メッセージ用のボットをまだ用意していない場合は、それぞれの手引きをご覧ください。
- [Telegram の設定手引き](/hermes/docs/user-guide/messaging/telegram/)
- [Discord の設定手引き](/hermes/docs/user-guide/messaging/discord/)

ゲートウェイを起動して、メッセージのサービスにつなぎます。

```bash
hermes gateway        # Start the gateway (connects to configured platforms)
hermes gateway setup  # Interactive setup wizard for first-time configuration
```

### Discord: チャンネルと DM {#discord-channels-vs-dms}

ボットは Discord で2つのやりとりの形に対応します。

| 形 | 話しかけ方 | メンションの要否 | 準備 |
|------|------------|-----------------|-------|
| **ダイレクトメッセージ（DM）** | ボットのプロフィールを開いて「メッセージ」 | 不要 | そのまま使えます |
| **サーバーのチャンネル** | ボットがいるテキストチャンネルで入力 | 必要（`@botname`） | ボットをサーバーに招待しておく必要があります |

**DM（個人で使うならこちらがおすすめ）:** ボットとの DM を開いて入力するだけです。@メンションは要りません。音声返信もすべてのコマンドも、チャンネルと同じように動きます。

**サーバーのチャンネル:** ボットは @メンションされたときだけ返事をします（例: `@hermesbyt4 hello`）。メンションの候補からは、同じ名前のロールではなく、**ボットのユーザー**を選んでください。

:::tip
サーバーのチャンネルでメンションを不要にするには、`~/.hermes/.env` に次を書き足します。
```bash
DISCORD_REQUIRE_MENTION=false
```
あるいは、特定のチャンネルだけメンションなしで返事をするように設定します。
```bash
DISCORD_FREE_RESPONSE_CHANNELS=123456789,987654321
```
:::

### コマンド {#commands}

次は Telegram と Discord（DM とテキストチャンネル）の両方で使えます。

```
/voice          Toggle voice mode on/off
/voice on       Voice replies only when you send a voice message
/voice tts      Voice replies for ALL messages
/voice off      Disable voice replies
/voice status   Show current setting
```

### 動作の種類 {#modes}

| 種類 | コマンド | 動き |
|------|---------|----------|
| `off` | `/voice off` | 文字のみ（既定） |
| `voice_only` | `/voice on` | 音声メッセージを送ったときだけ、返事を読み上げます |
| `all` | `/voice tts` | すべてのメッセージに対して返事を読み上げます |

音声モードの設定は、ゲートウェイを再起動しても引き継がれます。

### 送り先ごとの届き方 {#platform-delivery}

| 送り先 | 形式 | 備考 |
|----------|--------|-------|
| **Telegram** | 音声メッセージの吹き出し（Opus/OGG） | チャットの中でそのまま再生できます。必要に応じて ffmpeg が MP3 → Opus に変換します |
| **Discord** | 標準の音声メッセージの吹き出し（Opus/OGG） | 人が送った音声メッセージと同じように再生できます。吹き出しの API が失敗した場合は、ファイル添付に切り替わります |

---

## Discord のボイスチャンネル {#discord-voice-channels}

いちばん没入感のある音声機能です。ボットが Discord のボイスチャンネルに参加し、話し声を聞き取り、文字に起こし、エージェントで処理し、返事をそのボイスチャンネルで読み上げます。

### 準備 {#setup}

#### 1. Discord ボットの権限 {#1-discord-bot-permissions}

文字のやりとり用に Discord のボットをすでに用意してある場合（[Discord の設定手引き](/hermes/docs/user-guide/messaging/discord/)を参照）、音声の権限を追加する必要があります。

[Discord Developer Portal](https://discord.com/developers/applications) を開き、自分のアプリケーション → **Installation** → **Default Install Settings** → **Guild Install** と進みます。

**いまの文字用の権限に、次を追加します。**

| 権限 | 役割 | 必要か |
|-----------|---------|----------|
| **Connect** | ボイスチャンネルに参加する | 必要 |
| **Speak** | ボイスチャンネルで TTS の音声を鳴らす | 必要 |
| **Use Voice Activity** | 発話しているかどうかを検出する | 推奨 |

**更新後の権限の数値:**

| 段階 | 数値 | 含まれるもの |
|-------|---------|----------------|
| 文字のみ | `309237763136` | View Channels、Send Messages、Read History、Embeds、Attachments、Threads、Reactions、Create Public Threads |
| 文字 + 音声 | `309240908864` | 上記すべて + Connect、Speak |

更新した権限の URL で**ボットを招待し直します**。

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=309240908864
```

`YOUR_APP_ID` は、Developer Portal で確認できる自分の Application ID に置き換えます。

:::warning
すでに参加しているサーバーにボットを招待し直すと、ボットが外れることなく権限だけが更新されます。データも設定も失われません。
:::

#### 2. 特権が要るゲートウェイインテント {#2-privileged-gateway-intents}

[Developer Portal](https://discord.com/developers/applications) を開き、自分のアプリケーション → **Bot** → **Privileged Gateway Intents** で、3つすべてを有効にします。

| インテント | 役割 |
|--------|---------|
| **Presence Intent** | ユーザーがオンラインかどうかを検出する |
| **Server Members Intent** | `DISCORD_ALLOWED_USERS` のユーザー名を数値の ID に対応づける（条件による） |
| **Message Content Intent** | チャンネルの文字メッセージの中身を読む |

**Message Content Intent** は必須です。**Server Members Intent** が必要なのは、`DISCORD_ALLOWED_USERS` にユーザー名を書いている場合だけです。数値のユーザー ID を使っているなら、無効のままで構いません。ボイスチャンネルでの SSRC とユーザー ID の対応づけは、音声用 WebSocket で届く Discord の SPEAKING オペコードから得られるので、Server Members Intent は**必要ありません**。

#### 3. Opus コーデック {#3-opus-codec}

ゲートウェイを動かす機械に、Opus コーデックのライブラリを入れておく必要があります。

```bash
# macOS (Homebrew)
brew install opus

# Ubuntu/Debian
sudo apt install libopus0
```

ボットは、次の場所からコーデックを自動で読み込みます。
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

### ゲートウェイを起動する {#start-the-gateway}

```bash
hermes gateway        # Start with existing configuration
```

数秒のうちに、ボットが Discord でオンラインになります。

### コマンド {#commands}

ボットがいる Discord のテキストチャンネルで、次を使います。

```
/voice join      Bot joins your current voice channel
/voice channel   Alias for /voice join
/voice leave     Bot disconnects from voice channel
/voice status    Show voice mode and connected channel
```

:::info
`/voice join` を実行する前に、自分がボイスチャンネルに入っている必要があります。ボットは、あなたがいるのと同じ通話に参加します。
:::

### 仕組み {#how-it-works}

ボットがボイスチャンネルに参加すると、次のように動きます。

1. 参加者ごとの音声を、それぞれ独立して**聞き取ります**
2. **無音を検出します** — 0.5 秒以上の発話のあと 1.5 秒の無音が続くと、処理が始まります
3. Whisper の音声認識（手元、Groq、OpenAI のいずれか）で**文字に起こします**
4. エージェントの処理の流れ（セッション、ツール、記憶）を**ひととおり通します**
5. TTS でボイスチャンネルに返事を**読み上げます**

### テキストチャンネルとの連携 {#text-channel-integration}

ボットがボイスチャンネルにいるあいだは、次のようになります。

- 文字起こしがテキストチャンネルに出ます: `[Voice] @user: what you said`
- エージェントの返事は、チャンネルに文字で送られると同時に、通話でも読み上げられます
- 対象のテキストチャンネルは、`/voice join` を実行したチャンネルです

### 自分の声を拾わない仕組み {#echo-prevention}

ボットは TTS の返事を鳴らしているあいだ、音声の聞き取りを自動で止めます。自分が出した音を聞き取って処理し直すことがありません。

### 使える人の制限 {#access-control}

音声でやりとりできるのは、`DISCORD_ALLOWED_USERS` に書かれた人だけです。それ以外の人の音声は、黙って無視されます。

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

### 音声認識の提供元の比較 {#stt-provider-comparison}

| 提供元 | モデル | 速さ | 品質 | 費用 | API キー |
|----------|-------|-------|---------|------|---------|
| **手元** | `base` | 速い（CPU/GPU 次第） | 良い | 無料 | 不要 |
| **手元** | `small` | ふつう | より良い | 無料 | 不要 |
| **手元** | `large-v3` | 遅い | 最良 | 無料 | 不要 |
| **Groq** | `whisper-large-v3-turbo` | とても速い（およそ 0.5 秒） | 良い | 無料枠あり | 必要 |
| **Groq** | `whisper-large-v3` | 速い（およそ 1 秒） | より良い | 無料枠あり | 必要 |
| **OpenAI** | `whisper-1` | 速い（およそ 1 秒） | 良い | 有料 | 必要 |
| **OpenAI** | `gpt-4o-transcribe` | ふつう（およそ 2 秒） | 最良 | 有料 | 必要 |
| **OpenAI** | `gpt-transcribe` | 速い | 最良 | 有料（1分 0.0045 ドル） | 必要 |
| **Mistral** | `voxtral-mini-latest` | 速い | 良い | 有料 | 必要 |
| **xAI** | `grok-stt` | 速い | 良い | 有料 | 必要 |

提供元の優先順（自動で切り替わります）: **local** > **groq** > **openai**

### 読み上げの提供元の比較 {#tts-provider-comparison}

| 提供元 | 品質 | 費用 | 応答の速さ | キーの要否 |
|----------|---------|------|---------|-------------|
| **Edge TTS** | 良い | 無料 | およそ 1 秒 | 不要 |
| **ElevenLabs** | とても良い | 有料 | およそ 2 秒 | 必要 |
| **OpenAI TTS** | 良い | 有料 | およそ 1.5 秒 | 必要 |
| **NeuTTS** | 良い | 無料 | CPU/GPU 次第 | 不要 |

NeuTTS は、上に挙げた `tts.neutts` の設定のかたまりを使います。

`openai` の場合、`text_to_speech` ツールは任意の `instructions`
という引数を受け取り、`gpt-4o-mini-tts` の声づくりの機能（口調、
感情、話す速さ、なまり、ささやき）を引き出せます。この項目は
`tts.openai.base_url` でつないだ OpenAI 互換の声づくりのサーバー
（例: oMLX 経由の Qwen3-TTS-VoiceDesign）にも渡されます。

---

## 困ったときは {#troubleshooting}

### 「No audio device found」（CLI） {#no-audio-device-found-cli}

PortAudio が入っていません。

```bash
brew install portaudio    # macOS
sudo apt install portaudio19-dev  # Ubuntu
```

Linux のデスクトップで Docker の中の Hermes を動かしている場合、コンテナからホスト側の音声の窓口にも届く必要があります。PulseAudio や PipeWire に対応した設定については、[Docker の音声の橋渡し](/hermes/docs/user-guide/docker/#optional-linux-desktop-audio-bridge)の説明をご覧ください。

### Discord のサーバーのチャンネルでボットが返事をしない {#bot-doesnt-respond-in-discord-server-channels}

サーバーのチャンネルでは、既定でボットへの @メンションが必要です。次を確認してください。

1. `@` を入力し、同じ名前の**ロール**ではなく、**ボットのユーザー**（#付きの識別子があるもの）を選ぶ
2. あるいは DM を使う。メンションは要りません
3. あるいは `~/.hermes/.env` に `DISCORD_REQUIRE_MENTION=false` を設定する

### ボットが通話に参加するが、声を聞き取ってくれない {#bot-joins-vc-but-doesnt-hear-me}

- 自分の Discord のユーザー ID が `DISCORD_ALLOWED_USERS` に入っているか確認します
- Discord でミュートになっていないか確認します
- ボットが音声を対応づけるには Discord からの SPEAKING イベントが必要です。参加してから数秒のうちに話し始めてください

### 声は届いているのに返事がない {#bot-hears-me-but-doesnt-respond}

- 音声認識が使えるか確かめます。`faster-whisper` を入れる（キー不要）か、`GROQ_API_KEY` / `VOICE_TOOLS_OPENAI_KEY` を設定します
- LLM のモデルが設定され、つながる状態か確認します
- ゲートウェイの記録を見ます: `tail -f ~/.hermes/logs/gateway.log`

### 文字では返事をするが、ボイスチャンネルで話さない {#bot-responds-in-text-but-not-in-voice-channel}

- TTS の提供元が失敗している可能性があります。API キーと利用枠を確認してください
- Edge TTS（無料、キー不要）が既定の代わりの選択肢です
- 記録に TTS のエラーが出ていないか確認します

### Whisper がでたらめな文字を返す {#whisper-returns-garbage-text}

幻聴のような文字列を除く仕組みが、ほとんどの場合を自動で捉えます。それでもありもしない文字起こしが出る場合は、次を試してください。

- もっと静かな場所で使う
- 設定の `silence_threshold` を調整する（大きくすると反応しにくくなります）
- 別の音声認識モデルを試す
