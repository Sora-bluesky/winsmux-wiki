---
title: "ストリーミング TTS の内部構造"
description: "文チャンカー、ストリーミングプロバイダーの ABC、対応表、ストリーミング TTS プロバイダーの追加方法"
upstream_path: developer-guide/streaming-tts.md
upstream_blob: 2cd77224e181fcd5af5ed159a334d4808638c074
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/streaming-tts
---

# ストリーミング TTS {#streaming-tts}

Hermes は、音声がすべてそろうのを待ってから再生するのではなく、プロバイダーから
届いた順に TTS 音声をストリーミング再生できます。この仕組みは、音声モード（CLI/TUI での
リアルタイム会話）、ダッシュボードの speak-stream WebSocket、そしてゲートウェイの
`StreamingTTSConsumer` を通じて、ストリーミング音声に対応したプラットフォームアダプターで使われます。
音声での返答は、生成と音声合成がすべて終わってからではなく、最初の文節ができた時点で話し始めます。

## 構成 {#architecture}

ストリーミングのパイプラインは 4 つの部分でできています。

1. **生成側** — LLM が応答を生成しながら、テキストの差分を出力します
2. **文チャンカー** — `tools.tts_streaming.SentenceChunker` が差分をため込み、
   `<think>` ブロックを取り除き（差分をまたいで分割されていても除去します）、
   完成した文ごとに送り出します
3. **TTS プロバイダー** — 登録された `StreamingTTSProvider` が、各文を
   生の PCM チャンク（プロバイダーが宣言した `sample_rate` の int16 モノラル）に変換します
4. **音声の出力先** — ローカル再生では `sounddevice.OutputStream`
   （`tools.tts_tool_speaker.stream_tts_to_speaker`）、ゲートウェイでは
   プラットフォームアダプターの `write_streaming_tts` の接続口（`gateway/streaming_tts_consumer.py`）です

チャンク単位の API を持たないプロバイダーでも、実績のある同期経路の
`text_to_speech_tool` を通して*文*ごとに再生されるため、既定の edge でも会話のように話せます。
読み上げるテキストはすべて `tools.tts_text_normalize.prepare_spoken_text` で整えられます
（整形処理は 1 つで、全経路共通です）。

## プロバイダーの選び方 {#how-to-pick-a-provider}

既定では、すでに設定済みのプロバイダー（`tts.provider`）がチャンク単位の API を持っていれば、
ディスパッチャーはそのプロバイダーでストリーミングします。ストリーミングのためだけに、
黙って別のプロバイダーの声に切り替えることはありません。

変更したい場合は、`config.yaml` で `tts.streaming.provider` を設定します。

- プロバイダー名（`elevenlabs`、`gemini`、`openai`、`xai`）を指定すると、そのストリーマーに固定されます
- `auto` を指定すると、優先順位 `elevenlabs → gemini → openai → xai` を順にたどり、
  認証情報が解決できた最初のものを使います。「使える中で最良のチャンク対応の声」を
  明示的に選ぶ設定です

```yaml
tts:
  provider: gemini
  streaming:
    provider: gemini      # or "auto"
  gemini:
    model: gemini-2.5-flash-preview-tts
    voice: Kore
```

## 対応表 {#capability-matrix}

| プロバイダー | 通信方式                              | チャンク PCM | 認証情報 |
|-------------|---------------------------------------|-------------|-------------|
| elevenlabs  | チャンク HTTP（`pcm_24000`）            | 対応         | `ELEVENLABS_API_KEY` / `tts.elevenlabs` |
| openai      | チャンク HTTP（`with_streaming_response`、`pcm`） | 対応 | `tts.openai.api_key` → 環境変数 → マネージドゲートウェイ |
| gemini      | SSE（`streamGenerateContent?alt=sse`） | 対応         | `GEMINI_API_KEY` / `GOOGLE_API_KEY` |
| xai         | WebSocket（`wss://api.x.ai/v1/tts`）   | 対応         | `XAI_API_KEY` を優先し、なければ xAI OAuth（サブスクリプションのベアラートークンは従量課金の TTS では 403 になります） |
| edge、piper、kitten、neutts、mistral、minimax、deepinfra など | — | 非対応（文ごとの同期フォールバック） | 通常どおり |

認証情報の参照はすべて `resolve_provider_secret()` を通ります
（設定 > 環境変数/.env > 認証情報プール）。環境変数を直接読むことはありません。ストリーミングの
本文は 1 文あたり 16 MiB が上限で、同期プロバイダーでの「上流から受け取る本文には上限がある」
という不変条件と同じです。

## 新しいストリーミングプロバイダーを追加する {#adding-a-new-streaming-provider}

1. `tools/tts_streaming.py` で `StreamingTTSProvider` のサブクラスを作ります
2. `sample_rate` を設定します（int16 モノラル以外なら `channels` / `sample_width` も設定します）
3. `available()`（純粋な確認処理で、何もインストールしないこと）と、
   生の PCM チャンクを返す `stream(self, text) -> Iterator[bytes]` を実装します
4. `@register("yourname")` デコレーターを付けます
5. `tests/tools/test_tts_streaming.py` にテストを追加します

ABC が契約を守らせ、レジストリがプロバイダーを見つけられるようにします。
文のバッファ、停止イベント、音声の出力先は、ディスパッチャー（`stream_tts_to_speaker`）と
ゲートウェイのコンシューマーが引き受けるので、自分で実装する必要はありません。

## ゲートウェイでのストリーミング（プラットフォームアダプター） {#gateway-streaming-platform-adapters}

`gateway/streaming_tts_consumer.py` は、エージェントのテキスト差分をアダプターの
ストリーミング音声の接続口へ橋渡しします。アダプターは、
`BasePlatformAdapter` の次のメソッドをオーバーライドすることで対応を宣言します。

- `supports_streaming_tts(chat_id, audio_format) -> bool`
- `begin_streaming_tts / write_streaming_tts / finish_streaming_tts /
  abort_streaming_tts`

どれも既定では非対応／何もしない実装なので、既存のアダプターには影響しません。
あるターンのストリーミング音声が最後まで再生されると、そのターンのファイル全体での
自動 TTS 返答は抑止されます（二重に再生されません）。音声が聞こえる前にストリーミングが
失敗した場合、ゲートウェイは従来のファイル全体での音声返答に切り替えます。
