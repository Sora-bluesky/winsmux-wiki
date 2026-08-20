---
title: "Hermes で音声モードを使う"
description: "CLI・Telegram・Discord・Discord のボイスチャンネルで Hermes の音声モードを設定して使うための実践ガイド"
upstream_path: guides/use-voice-mode-with-hermes.md
upstream_blob: 996f0167b0d04608a22ef78f2ec4076fd5b635e9
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/use-voice-mode-with-hermes
---

# Hermes で音声モードを使う {#use-voice-mode-with-hermes}

このガイドは、[音声モードの機能早見表](/hermes/docs/user-guide/features/voice-mode/)と対になる実践編です。

機能ページが「音声モードで何ができるか」を説明するものだとすれば、こちらは「どう使えばうまくいくか」の話です。

:::tip
[Nous Portal](/hermes/docs/integrations/nous-portal/) なら LLM と TTS の両方が 1 回の OAuth でまとまって使えるので、追加の認証情報なしで音声モードが最初から最後まで動きます。
:::

## 音声モードが向いている場面 {#what-voice-mode-is-good-for}

音声モードがとくに役立つのは、次のような場面です。
- 手を使わずに CLI で作業を進めたい
- Telegram や Discord で読み上げの返答がほしい
- Discord のボイスチャンネルに Hermes を置いて、その場で会話したい
- 歩き回りながら、思いつきの記録・デバッグ・やり取りを、入力せずに済ませたい

## 音声モードの構成を選ぶ {#choose-your-voice-mode-setup}

Hermes の音声体験は、大きく 3 種類に分かれます。

| モード | 向いている用途 | プラットフォーム |
|---|---|---|
| マイクの対話ループ | コーディングや調査をしながら、手を使わずに個人で使う | CLI |
| チャットでの読み上げ返答 | 通常のメッセージのやり取りに読み上げを添える | Telegram、Discord |
| ボイスチャンネルの常駐ボット | ボイスチャンネルでのグループや個人のライブ会話 | Discord のボイスチャンネル |

進め方としては、次の順がおすすめです。
1. まずテキストで動く状態にする
2. 次に読み上げの返答を有効にする
3. すべてを味わいたいなら、最後に Discord のボイスチャンネルへ進む

## ステップ 1: 通常の Hermes が動くことをまず確かめる {#step-1-make-sure-normal-hermes-works-first}

音声モードに手を付ける前に、次を確認します。
- Hermes が起動する
- プロバイダの設定が済んでいる
- テキストのプロンプトにエージェントが普通に答えられる

```bash
hermes
```

簡単なことを尋ねてみます。

```text
What tools do you have available?
```

ここが固まっていないなら、先にテキストモードを直してください。

## ステップ 2: 必要な追加機能を入れる {#step-2-install-the-right-extras}

### CLI のマイク入力と再生 {#cli-microphone-playback}

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[voice]"
```

### メッセージングのプラットフォーム {#messaging-platforms}

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[messaging]"
```

### 高品質な ElevenLabs の TTS {#premium-elevenlabs-tts}

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[tts-premium]"
```

### ローカルの NeuTTS（任意） {#local-neutts-optional}

```bash
python -m pip install -U neutts[all]
```

### すべて {#everything}

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[all]"
```

## ステップ 3: システム側の依存関係を入れる {#step-3-install-system-dependencies}

### macOS {#macos}

```bash
brew install portaudio ffmpeg opus
brew install espeak-ng
```

### Ubuntu / Debian {#ubuntu-debian}

```bash
sudo apt install portaudio19-dev ffmpeg libopus0
sudo apt install espeak-ng
```

それぞれの役割は次のとおりです。
- `portaudio` → CLI の音声モードでのマイク入力と再生
- `ffmpeg` → TTS とメッセージ配信のための音声変換
- `opus` → Discord の音声コーデックへの対応
- `espeak-ng` → NeuTTS が使う音素化の処理系

## ステップ 4: STT と TTS のプロバイダを選ぶ {#step-4-choose-stt-and-tts-providers}

Hermes はローカルとクラウドの両方の音声処理に対応しています。

### いちばん手軽で安上がりな構成 {#easiest-cheapest-setup}

ローカルの STT と無料の Edge TTS を使います。
- STT プロバイダ: `local`
- TTS プロバイダ: `edge`

たいていはここから始めるのがよいでしょう。

### 環境設定ファイルの例 {#environment-file-example}

`~/.hermes/.env` に次を追記します。

```bash
# Cloud STT options (local needs no key)
GROQ_API_KEY=***
VOICE_TOOLS_OPENAI_KEY=***

# Premium TTS (optional)
ELEVENLABS_API_KEY=***
```

### プロバイダの選び方 {#provider-recommendations}

#### 音声認識 {#speech-to-text}

- `local` → プライバシーを守りつつ費用をかけずに使うなら、これが既定として最良
- `groq` → クラウドでの文字起こしが非常に速い
- `openai` → 有料の代替として悪くない

#### 音声合成 {#text-to-speech}

- `edge` → 無料で、多くの人には十分な品質
- `neutts` → 手元の端末で動く無料の TTS
- `elevenlabs` → 品質は最上
- `openai` → ほどよい中間
- `mistral` → 多言語対応で、Opus をそのまま扱える

### `hermes setup` を使う場合 {#if-you-use-hermes-setup}

設定ウィザードで NeuTTS を選ぶと、Hermes は `neutts` がすでに入っているかを調べます。入っていなければ、NeuTTS には Python パッケージの `neutts` とシステムパッケージの `espeak-ng` が必要だと伝えたうえで、代わりに導入するかを尋ね、`espeak-ng` はお使いのプラットフォームのパッケージ管理ツールで入れ、そのあと次を実行します。

```bash
python -m pip install -U neutts[all]
```

この導入を飛ばした場合や失敗した場合は、ウィザードが Edge TTS に切り替えます。

## ステップ 5: おすすめの設定 {#step-5-recommended-config}

```yaml
voice:
  record_key: "ctrl+b"
  submit_mode: "direct"  # TUI: direct | draft
  max_recording_seconds: 120
  auto_tts: false
  beep_enabled: true
  silence_threshold: 200
  silence_duration: 3.0

stt:
  provider: "local"
  local:
    model: "base"

tts:
  provider: "edge"
  edge:
    voice: "en-US-AriaNeural"
```

多くの人にとって、控えめで扱いやすい既定になっています。

TUI では、文字起こしのあとの動きを `voice.submit_mode` が決めます。

- `direct`（既定）は、文字起こしの結果をそのまま送信します。
- `draft` は結果を入力欄に置くので、Enter を押す前に手直ししたり取り消したりできます。

音声の下書きを編集したい場合は、次のように設定します。

```yaml
voice:
  submit_mode: "draft"
```

TTS をローカルで動かしたい場合は、`tts` のブロックを次のように差し替えます。

```yaml
tts:
  provider: "neutts"
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
```

## 使い方 1: CLI の音声モード {#use-case-1-cli-voice-mode}

## 有効にする {#turn-it-on}

Hermes を起動します。

```bash
hermes
```

CLI の中で次を実行します。

```text
/voice on
```

### 録音の流れ {#recording-flow}

既定のキーは次のとおりです。
- `Ctrl+B`

手順はこうなります。
1. `Ctrl+B` を押す
2. 話す
3. 無音の検出で録音が自動的に止まるのを待つ
4. Hermes が文字起こしをして応答する
5. TTS が有効なら、答えを読み上げる
6. 続けて使えるように、ループが自動で再開することもある

### よく使うコマンド {#useful-commands}

```text
/voice
/voice on
/voice off
/voice tts
/voice status
```

### CLI で相性のよい使い方 {#good-cli-workflows}

#### 立ったままのデバッグ {#walk-up-debugging}

こう話しかけます。

```text
I keep getting a docker permission error. Help me debug it.
```

そのまま手を使わずに続けられます。
- 「さっきのエラーをもう一度読んで」
- 「根本の原因をもっと平たい言葉で説明して」
- 「では、直し方をそのまま教えて」

#### 調査・発想 {#research-brainstorming}

次のような場面に向いています。
- 考えごとをしながら歩き回る
- まとまっていない思いつきを口に出す
- 考えを Hermes にその場で整理してもらう

#### アクセシビリティ・入力を減らしたいとき {#accessibility-low-typing-sessions}

入力しづらい状況では、音声モードは Hermes のやり取りに入り続けるための最速の手段のひとつです。

## CLI の挙動を調整する {#tuning-cli-behavior}

### 無音の判定値 {#silence-threshold}

Hermes の開始・停止が過敏だと感じたら、次を調整します。

```yaml
voice:
  silence_threshold: 250
```

値を大きくするほど鈍くなります。

### 無音の継続時間 {#silence-duration}

文と文のあいだで間を取ることが多いなら、大きくします。

```yaml
voice:
  silence_duration: 4.0
```

### 録音のキー {#record-key}

`Ctrl+B` が端末や tmux の操作と重なる場合は、次のようにします。

```yaml
voice:
  record_key: "ctrl+space"
```

## 使い方 2: Telegram や Discord での読み上げ返答 {#use-case-2-voice-replies-in-telegram-or-discord}

こちらは、ボイスチャンネルを使う方式より単純です。

Hermes は普通のチャットボットのままで、返答を読み上げられるようになります。

### ゲートウェイを起動する {#start-the-gateway}

```bash
hermes gateway
```

### 読み上げ返答を有効にする {#turn-on-voice-replies}

Telegram か Discord の中で次を実行します。

```text
/voice on
```

または

```text
/voice tts
```

### モード {#modes}

| モード | 意味 |
|---|---|
| `off` | テキストのみ |
| `voice_only` | 利用者が音声を送ったときだけ読み上げる |
| `all` | すべての返答を読み上げる |

### どちらを使うか {#when-to-use-which-mode}

- 音声から始まったやり取りにだけ読み上げてほしいなら `/voice on`
- 常に読み上げる相手にしたいなら `/voice tts`

### メッセージングで相性のよい使い方 {#good-messaging-workflows}

#### 手元のスマートフォンで動く Telegram の助手 {#telegram-assistant-on-your-phone}

次のような場面で使います。
- 自分の端末から離れている
- 音声メモを送って、読み上げの返答をすぐ受け取りたい
- Hermes を持ち歩ける調査・運用の助手として使いたい

#### 読み上げ付きの Discord のダイレクトメッセージ {#discord-dms-with-spoken-output}

サーバーのチャンネルでのメンションの決まりを気にせず、個別にやり取りしたいときに便利です。

## 使い方 3: Discord のボイスチャンネル {#use-case-3-discord-voice-channels}

いちばん高度な使い方です。

Hermes が Discord のボイスチャンネルに参加し、参加者の発話を聞き取り、文字起こしをして、通常のエージェントの処理を回し、返答をそのチャンネルに読み上げます。

## 必要な Discord の権限 {#required-discord-permissions}

通常のテキストボットの設定に加えて、ボットに次の権限があることを確認してください。
- 接続
- 発言
- できれば音声検出の使用

さらに、開発者ポータルで特権インテントも有効にします。
- Presence Intent
- Server Members Intent
- Message Content Intent

## 参加と退出 {#join-and-leave}

ボットがいる Discord のテキストチャンネルで次を実行します。

```text
/voice join
/voice leave
/voice status
```

### 参加すると何が起きるか {#what-happens-when-joined}

- 参加者がボイスチャンネルで話す
- Hermes が発話の切れ目を検出する
- 文字起こしが、紐づいたテキストチャンネルに投稿される
- Hermes がテキストと音声の両方で応答する
- 対象のテキストチャンネルは、`/voice join` を実行した場所になる

### Discord のボイスチャンネルで気をつけること {#best-practices-for-discord-vc-use}

- `DISCORD_ALLOWED_USERS` は絞ったままにする
- 最初のうちは、ボット用・試験用の専用チャンネルを使う
- ボイスチャンネルを試す前に、普通のテキストチャットの音声モードで STT と TTS が動くことを確かめる

## 音声品質の選び方 {#voice-quality-recommendations}

### 品質を優先する構成 {#best-quality-setup}

- STT: ローカルの `large-v3` または Groq の `whisper-large-v3`
- TTS: ElevenLabs

### 速さと手軽さを優先する構成 {#best-speed-convenience-setup}

- STT: ローカルの `base` または Groq
- TTS: Edge

### 費用をかけない構成 {#best-zero-cost-setup}

- STT: ローカル
- TTS: Edge

## よくある不具合 {#common-failure-modes}

### 「オーディオデバイスが見つからない」 {#no-audio-device-found}

`portaudio` を入れてください。

### 「ボットは参加するが何も聞き取らない」 {#bot-joins-but-hears-nothing}

次を確認します。
- 自分の Discord ユーザー ID が `DISCORD_ALLOWED_USERS` に入っているか
- 自分がミュートになっていないか
- 特権インテントが有効になっているか
- ボットに接続と発言の権限があるか

### 「文字起こしはするが話さない」 {#it-transcribes-but-does-not-speak}

次を確認します。
- TTS プロバイダの設定
- ElevenLabs や OpenAI の API キーと残りの利用枠
- Edge の変換経路で使う `ffmpeg` が入っているか

### 「Whisper の出力がでたらめになる」 {#whisper-outputs-garbage}

次を試してください。
- より静かな場所で使う
- `silence_threshold` を大きくする
- 別の STT のプロバイダやモデルを使う
- 一度の発話を短く、はっきりさせる

### 「ダイレクトメッセージでは動くが、サーバーのチャンネルでは動かない」 {#it-works-in-dms-but-not-in-server-channels}

たいていはメンションの扱いが原因です。

既定では、Discord のサーバーのテキストチャンネルでは、設定を変えないかぎりボットへの `@mention` が必要です。

## 最初の 1 週間におすすめの手順 {#suggested-first-week-setup}

いちばん短い道のりを進みたいなら、次のようにします。

1. まずテキストの Hermes を動かす
2. `hermes setup tts` を実行して音声のサポートを有効にする
3. ローカルの STT と Edge TTS で CLI の音声モードを使う
4. 次に Telegram か Discord で `/voice on` を有効にする
5. そのあとで初めて、Discord のボイスチャンネルを試す

この順番なら、問題を切り分ける範囲を小さく保てます。

## 次に読むもの {#where-to-read-next}

- [音声モードの機能早見表](/hermes/docs/user-guide/features/voice-mode/)
- [メッセージングのゲートウェイ](/hermes/docs/user-guide/messaging/)
- [Discord の設定](/hermes/docs/user-guide/messaging/discord/)
- [Telegram の設定](/hermes/docs/user-guide/messaging/telegram/)
- [設定](/hermes/docs/user-guide/configuration/)
