---
title: "ストリーミング TTS の内部"
description: "文分割チャンカー、ストリーミングプロバイダーの ABC、対応状況の表、ストリーミング TTS プロバイダーの追加方法"
upstream_path: developer-guide/streaming-tts.md
upstream_blob: dd8280b94a8694f6fac5328e0540e53401bf57b6
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/streaming-tts
---

# ストリーミング TTS {#streaming-tts}

Hermes は、音声が全部そろうのを待たずに、プロバイダーから届いた端から
TTS の音声を流せます。音声モード（CLI / TUI での会話）、ダッシュボードの
speak-stream WebSocket、そしてゲートウェイの `StreamingTTSConsumer` を通じて
ストリーミング音声に対応したプラットフォームアダプターが、この仕組みを使います。
文章の生成と音声合成がすべて終わるのを待たず、最初のひと区切りができた時点で
返事が喋りはじめます。

## 仕組み {#architecture}

ストリーミングの流れは、4 つの部分でできています。

1. **生成側** — LLM が返事を作りながら、テキストの差分を送り出します
2. **文分割チャンカー** — `tools.tts_streaming.SentenceChunker` が差分をためこみ、
   `<think>` ブロックを（差分をまたいで分かれていても）取り除き、
   文として完成した分から送り出します
3. **TTS プロバイダー** — 登録された `StreamingTTSProvider` が、各文を生の PCM
   チャンク（プロバイダーが宣言した `sample_rate` の int16 モノラル）に変えます
4. **音声の出口** — 手元で再生するなら `sounddevice.OutputStream`
   （`tools.tts_tool_speaker.stream_tts_to_speaker`）、ゲートウェイのプラットフォーム
   アダプターなら `write_streaming_tts` の接続点（`gateway/streaming_tts_consumer.py`）

チャンク対応の API を持たないプロバイダーでも、実績のある同期版
`text_to_speech_tool` の経路を通って *文* 単位で再生されるので、
既定の edge でも会話らしいテンポになります。
読み上げるテキストはすべて `tools.tts_text_normalize.prepare_spoken_text` で
整えられます（整形役はひとつ、経路は全部これを通ります）。

## プロバイダーの選び方 {#how-to-pick-a-provider}

既定では、すでに設定しているプロバイダー（`tts.provider`）にチャンク対応の API が
あれば、そのままストリーミングします。ストリーミングしたいがために、
黙って別のプロバイダーの声に差し替えることはありません。

変えたいときは、`config.yaml` で `tts.streaming.provider` を設定します。

- プロバイダー名（`elevenlabs`、`gemini`、`openai`、`xai`）を書くと、その配信役に固定されます
- `auto` にすると `elevenlabs → gemini → openai → xai` の優先順で見ていき、
  認証情報が通った最初のものを使います。「使えるチャンク音声のうち一番いいもの」を
  自分から選ぶ設定です

```yaml
tts:
  provider: gemini
  streaming:
    provider: gemini      # or "auto"
    min_len: 20           # shortest first sentence (chars) spoken on its own; CJK setups use ~6
  gemini:
    model: gemini-2.5-flash-preview-tts
    voice: Kore
```

## 対応状況の表 {#capability-matrix}

| プロバイダー | 通信方式 | チャンク PCM | 認証情報 |
|-------------|---------------------------------------|-------------|-------------|
| elevenlabs  | チャンク HTTP（`pcm_24000`）            | 対応         | `ELEVENLABS_API_KEY` / `tts.elevenlabs` |
| openai      | チャンク HTTP（`with_streaming_response`、`pcm`） | 対応 | `tts.openai.api_key` → 環境変数 → マネージドゲートウェイ |
| gemini      | SSE（`streamGenerateContent?alt=sse`） | 対応         | `GEMINI_API_KEY` / `GOOGLE_API_KEY` |
| xai         | WebSocket（`wss://api.x.ai/v1/tts`）   | 対応         | `XAI_API_KEY` を優先、なければ xAI の OAuth（サブスクリプションの bearer は従量課金の TTS で 403 になります） |
| edge, piper, kitten, neutts, mistral, minimax, deepinfra, … | — | 非対応（文単位の同期処理で代替） | 通常どおり |
| `streams_pcm` 付きのプラグイン `TTSProvider` | プラグインの `stream(format="pcm")` | 対応（`stream_sample_rate` のサンプルレートで） | プラグイン自身のもの |

認証情報の取得はすべて `resolve_provider_secret()` を通ります
（設定ファイル > 環境変数 / .env > 認証情報プール）。環境変数を直接読むことはありません。
受け取る本文は 1 文あたり 16 MiB が上限で、同期版プロバイダーが守っている
「上流からの本文には上限を設ける」という不変条件と揃えてあります。

## ストリーミングプロバイダーを新しく足す {#adding-a-new-streaming-provider}

1. `tools/tts_streaming.py` で `StreamingTTSProvider` を継承します
2. `sample_rate` を設定します（int16 モノラルでなければ `channels` と `sample_width` も）
3. `available()`（何もインストールしない、純粋な判定だけの処理）と、
   生の PCM チャンクを返す `stream(self, text) -> Iterator[bytes]` を実装します
4. `@register("yourname")` を付けます
5. `tests/tools/test_tts_streaming.py` にテストを足します

契約は ABC が守らせ、プロバイダーは登録先から見つけられるようになります。
文のバッファ、停止イベント、音声の出口は、振り分け役（`stream_tts_to_speaker`）と
ゲートウェイの受け手が面倒を見てくれます。

## プラグインのプロバイダー {#plugin-providers}

プラグインの `TTSProvider`（`ctx.register_tts_provider()` で登録したもの）は、本体に手を入れずにこの経路へ加われます。
`streams_pcm = True` と正の値の `stream_sample_rate` を設定し、
`stream(text, format="pcm", voice=, model=, speed=)` が int16 モノラルの PCM を順に返すようにします。
`resolve_streaming_provider` はこれを（`tools.tts_streaming._PluginPCMStreamer` で）包み、
同期処理の振り分け役（`tools.tts_tool_plugins`）と同じ規則で振り分けます。組み込みの名前は登録先まで届かず、
同じ名前の `type: command` プロバイダーがあればそちらが優先され、プラグインには
`synthesize()` と同じ `tts.voice` / `tts.model` / `tts.speed` が渡ります。設定でプラグインを指定していれば、
まずそのプラグインでストリーミングします。`tts.streaming.provider: auto` のときは、組み込みの優先順位の一覧をすべて試したあとでだけ使われます。
`streams_pcm`、`stream_sample_rate`、`is_available()` は、ストリーミング役を決めるたびに読み直されます。
サンプルレートがない場合や、プロバイダーが使えないと答えた場合は、Hermes は文ごとの音声合成を続けます。
組み込みのストリーミング役と同じく、読み上げのパイプラインは最大 3 文まで先読みします。そのため、プラグインの `stream()` は
同時に呼ばれても動くようにしておく必要があります（同期の経路は `synthesize()` を 1 つずつ順に呼びますが、この経路はそうしません）。

## ゲートウェイでのストリーミング（プラットフォームアダプター） {#gateway-streaming-platform-adapters}

`gateway/streaming_tts_consumer.py` が、エージェントの差分とアダプターの
ストリーミング音声の接続点をつなぎます。アダプター側は
`BasePlatformAdapter` の次のものを上書きして対応します。

- `supports_streaming_tts(chat_id, audio_format) -> bool`
- `begin_streaming_tts / write_streaming_tts / finish_streaming_tts /
  abort_streaming_tts`

どれも既定では非対応・何もしない実装なので、いまあるアダプターには影響しません。
ある往復のストリーミング音声が最後まで流れたときは、その往復のファイル一括での
自動 TTS 返信は抑制されます（二重に鳴らないためです）。音が一度も鳴らないうちに
ストリーミングが失敗したときは、ゲートウェイが従来のファイル一括の音声返信に戻します。
