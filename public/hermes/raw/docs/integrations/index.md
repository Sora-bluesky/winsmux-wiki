---
title: "連携"
description: ""
upstream_path: integrations/index.md
upstream_blob: 8225c21d37b074f0298fe1ad1a2e65cb50cf1663
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations
---

# 連携 {#integrations}

Hermes Agent は、AI の推論、ツールサーバー、IDE での作業、プログラムからの呼び出しなど、さまざまな外部システムとつながります。これらの連携によって、Hermes にできることと、動かせる場所が広がります。

:::tip ここから始めてください
連携をひとつだけ設定する時間しかないなら、[Nous Portal](/hermes/docs/integrations/nous-portal/) を設定してください。OAuth で一度ログインするだけで、300 以上のモデルと、Tool Gateway の 4 つのツール（ウェブ検索、画像生成、音声合成、ブラウザ操作）がまとめて使えます。
:::

## AI プロバイダーとルーティング {#ai-providers-routing}

Hermes は複数の AI 推論プロバイダーを最初から扱えます。対話形式で設定するなら `hermes model` を使い、`config.yaml` に直接書くこともできます。

- **[AI プロバイダー](/hermes/docs/integrations/providers/)** — OpenRouter、Anthropic、OpenAI、Google、そして OpenAI 互換のエンドポイント全般。Hermes は画像認識・ストリーミング・ツール呼び出しといった機能の対応状況を、プロバイダーごとに自動で判別します。
- **[プロバイダールーティング](/hermes/docs/user-guide/features/provider-routing/)** — OpenRouter へのリクエストを、実際にどのプロバイダーが処理するかを細かく指定できます。並び替え、許可リスト、拒否リスト、優先順位の明示によって、費用・速度・品質のどれを取るかを調整できます。
- **[フォールバックプロバイダー](/hermes/docs/user-guide/features/fallback-providers/)** — 主に使っているモデルでエラーが起きたとき、予備の LLM プロバイダーへ自動的に切り替えます。主モデルのフォールバックに加えて、画像認識・圧縮・ウェブ本文抽出といった補助処理に対する独立したフォールバックも備えています。

## ツールサーバー（MCP） {#tool-servers-mcp}

- **[MCP サーバー](/hermes/docs/user-guide/features/mcp/)** — Model Context Protocol を通じて、Hermes を外部のツールサーバーにつなぎます。GitHub、データベース、ファイルシステム、ブラウザ基盤、社内 API などのツールを、Hermes 用のツールを自作せずに使えます。stdio と SSE の両方の通信方式、サーバーごとのツール絞り込み、対応状況に応じたリソースやプロンプトの登録に対応しています。

## ウェブ検索のバックエンド {#web-search-backends}

`web_search` ツールと `web_extract` ツールは 8 つのバックエンドに対応しており、`config.yaml` か `hermes tools` で設定します。

| バックエンド | 環境変数 | 検索 | 抽出 | クロール |
|---------|---------|--------|---------|-------|
| **Firecrawl**（既定） | `FIRECRAWL_API_KEY` | ✔ | ✔ | ✔ |
| **SearXNG** | `SEARXNG_URL` | ✔ | — | — |
| **Brave**（無料枠） | `BRAVE_SEARCH_API_KEY` | ✔ | — | — |
| **DuckDuckGo**（ddgs） | _(なし)_ | ✔ | — | — |
| **Tavily** | `TAVILY_API_KEY`（省略可） | ✔ | ✔ | — |
| **Exa** | `EXA_API_KEY` | ✔ | ✔ | — |
| **Parallel** | `PARALLEL_API_KEY` | ✔ | ✔ | — |
| **xAI** | `XAI_API_KEY` | ✔ | — | — |

設定例です。

```yaml
web:
  backend: firecrawl    # firecrawl | searxng | brave-free | ddgs | tavily | exa | parallel | xai
```

`web.backend` を指定しない場合は、用意されている API キーからバックエンドが自動的に選ばれます。`FIRECRAWL_API_URL` を使えば、自分で立てた Firecrawl も利用できます。`hermes tools` で Tavily を選ぶ場合は、キーがなくても動きます。

## ブラウザ操作 {#browser-automation}

Hermes には本格的なブラウザ操作機能があり、サイトの閲覧、フォームの入力、情報の取り出しを、いくつかのバックエンドから選んで実行できます。

- **Browser Use Cloud** — 検知されにくい設定、住宅用プロキシ、CAPTCHA の突破、使い回せるブラウザプロファイルを備えた、管理型の Chromium
- **Browserbase** — もうひとつのクラウドブラウザ提供元。管理型のブラウザ、ボット対策への対応、CAPTCHA の突破、住宅用プロキシを備えています
- **手元の Chromium 系ブラウザ（CDP 接続）** — 起動中の Chrome、Brave、Chromium、Edge に `/browser connect` でつなぎます
- **手元の Chromium** — `agent-browser` コマンドで動く、画面を出さないローカルブラウザ

設定と使い方は [ブラウザ操作](/hermes/docs/user-guide/features/browser/) を参照してください。

## 音声と TTS のプロバイダー {#voice-tts-providers}

すべてのメッセージングプラットフォームで、音声合成と音声認識が使えます。

| プロバイダー | 品質 | 費用 | API キー |
|----------|---------|------|---------|
| **Edge TTS**（既定） | 良好 | 無料 | 不要 |
| **ElevenLabs** | 非常に高い | 有料 | `ELEVENLABS_API_KEY` |
| **OpenAI TTS** | 良好 | 有料 | `VOICE_TOOLS_OPENAI_KEY` |
| **MiniMax** | 良好 | 有料 | `MINIMAX_API_KEY` |
| **xAI TTS** | 良好 | 有料 | `XAI_API_KEY` |
| **NeuTTS** | 良好 | 無料 | 不要 |

音声認識は 8 つのプロバイダーに対応しています。手元で動く faster-whisper（無料・端末内で処理）、ローカルコマンドのラッパー、Groq、OpenAI Whisper API、Mistral、xAI、ElevenLabs Scribe、DeepInfra です。音声メッセージの文字起こしは、Telegram、Discord、WhatsApp をはじめとする各プラットフォームで動きます。詳しくは [音声と TTS](/hermes/docs/user-guide/features/tts/) と [音声モード](/hermes/docs/user-guide/features/voice-mode/) を参照してください。

## IDE・エディタとの連携 {#ide-editor-integration}

- **[IDE 連携（ACP）](/hermes/docs/user-guide/features/acp/)** — VS Code、Zed、JetBrains など ACP に対応したエディタの中で Hermes Agent を使えます。Hermes は ACP サーバーとして動き、チャットのやり取り、ツールの動作、ファイルの差分、実行したコマンドをエディタ内に表示します。

## プログラムからの利用 {#programmatic-access}

- **[API サーバー](/hermes/docs/user-guide/features/api-server/)** — Hermes を OpenAI 互換の HTTP エンドポイントとして公開します。OpenAI 形式に対応したフロントエンド（Open WebUI、LobeChat、LibreChat、NextChat、ChatBox）なら、Hermes をバックエンドとしてつなぎ、そのツール群をまるごと使えます。

## 記憶とパーソナライズ {#memory-personalization}

- **[組み込みの記憶](/hermes/docs/user-guide/features/memory/)** — `MEMORY.md` と `USER.md` のファイルによる、選び抜かれた記憶を持続させる仕組みです。エージェントは個人的なメモと利用者のプロフィールを、量を抑えた形で保ち、セッションをまたいで引き継ぎます。
- **[記憶プロバイダー](/hermes/docs/user-guide/features/memory-providers/)** — 外部の記憶バックエンドをつないで、さらに踏み込んだパーソナライズができます。対応しているのは 8 つで、Honcho（対話的推論）、OpenViking（段階的な検索）、Mem0（クラウドでの抽出）、Hindsight（知識グラフ）、Holographic（手元の SQLite）、RetainDB（ハイブリッド検索）、ByteRover（CLI 方式）、Supermemory です。

## メッセージングプラットフォーム {#messaging-platforms}

Hermes は 27 以上のメッセージングプラットフォームでゲートウェイのボットとして動き、どれも同じ `gateway` の仕組みで設定します。

- **[Telegram](/hermes/docs/user-guide/messaging/telegram/)**、**[Discord](/hermes/docs/user-guide/messaging/discord/)**、**[Slack](/hermes/docs/user-guide/messaging/slack/)**、**[WhatsApp](/hermes/docs/user-guide/messaging/whatsapp/)**、**[Signal](/hermes/docs/user-guide/messaging/signal/)**、**[Matrix](/hermes/docs/user-guide/messaging/matrix/)**、**[Mattermost](/hermes/docs/user-guide/messaging/mattermost/)**、**[メール](/hermes/docs/user-guide/messaging/email/)**、**[SMS](/hermes/docs/user-guide/messaging/sms/)**、**[DingTalk](/hermes/docs/user-guide/messaging/dingtalk/)**、**[Feishu/Lark](/hermes/docs/user-guide/messaging/feishu/)**、**[WeCom](/hermes/docs/user-guide/messaging/wecom/)**、**[WeCom コールバック](/hermes/docs/user-guide/messaging/wecom-callback/)**、**[Weixin](/hermes/docs/user-guide/messaging/weixin/)**、**[BlueBubbles](/hermes/docs/user-guide/messaging/bluebubbles/)**、**[Buzz](/hermes/docs/user-guide/messaging/buzz/)**、**[QQ ボット](/hermes/docs/user-guide/messaging/qqbot/)**、**[Yuanbao](/hermes/docs/user-guide/messaging/yuanbao/)**、**[Home Assistant](/hermes/docs/user-guide/messaging/homeassistant/)**、**[Microsoft Teams](/hermes/docs/user-guide/messaging/teams/)**、**[Microsoft Teams 会議](/hermes/docs/user-guide/messaging/teams-meetings/)**、**[Microsoft Graph webhook](/hermes/docs/user-guide/messaging/msgraph-webhook/)**、**[Google Chat](/hermes/docs/user-guide/messaging/google_chat/)**、**[LINE](/hermes/docs/user-guide/messaging/line/)**、**[ntfy](/hermes/docs/user-guide/messaging/ntfy/)**、**[SimpleX](/hermes/docs/user-guide/messaging/simplex/)**、**[Open WebUI](/hermes/docs/user-guide/messaging/open-webui/)**、**[Webhook](/hermes/docs/user-guide/messaging/webhooks/)**

プラットフォームの比較表と設定手順は、[メッセージングゲートウェイの概要](/hermes/docs/user-guide/messaging/) を参照してください。

### 接続先への直行リンク {#quick-connect-links}

主要なプラットフォームには「ボットやアプリを作る」ための決まった URL があり、なかにはパラメータを付けると目的のフォームが開いた状態で始まるものもあります。管理画面を探し回らずに、ここから直接どうぞ。

| プラットフォーム | 直行リンク | 開くもの |
|----------|-------------|---------------|
| **Telegram** | [t.me/BotFather](https://t.me/BotFather) | BotFather とのチャット。`/newbot` を送るとボットのトークンが発行されます |
| **Discord** | [discord.com/developers/applications?new_application=true](https://discord.com/developers/applications?new_application=true) | 開発者ポータル。**New Application** のダイアログが開いた状態になります |
| **Slack** | [api.slack.com/apps?new_app=1](https://api.slack.com/apps?new_app=1) | **Create New App** のダイアログ。*From an app manifest* を選び、`hermes slack manifest --agent-view` が出力するマニフェストを貼り付けます |
| **LINE** | [developers.line.biz/console](https://developers.line.biz/console/) | LINE Developers Console。Messaging API のチャネルを作れます |
| **Feishu/Lark** | [open.feishu.cn/app](https://open.feishu.cn/app) | Feishu のオープンプラットフォーム管理画面。独自アプリを作れます |

たどり着いたあとに何をするかは、各プラットフォームの設定ページで説明しています。

## 共同作業の場 {#collaboration-workspaces}

- **[Buzz](/hermes/docs/integrations/buzz/)** — Block による、Nostr を基盤とした人とエージェントの作業空間です。つなぎ方は 3 通りあり、Buzz Desktop が Hermes を管理下の ACP ランタイムとして起動する方法、`buzz-acp` の中継ブリッジがサーバー側で Hermes の識別情報を持つ方法、ネイティブのゲートウェイプラットフォームが Hermes の記憶・スキル・承認・定期実行をそのまま携えて Buzz のチャンネルに参加する方法です。3 つの比較は概要ページにあります。

## ホームオートメーション {#home-automation}

- **[Home Assistant](/hermes/docs/user-guide/messaging/homeassistant/)** — 4 つの専用ツール（`ha_list_entities`、`ha_get_state`、`ha_list_services`、`ha_call_service`）で家じゅうのスマート機器を操作します。`HASS_TOKEN` を設定すると、Home Assistant のツール群が自動的に有効になります。

## プラグイン {#plugins}

- **[プラグインの仕組み](/hermes/docs/user-guide/features/plugins/)** — 本体のコードに手を入れずに、独自のツール、ライフサイクルフック、CLI コマンドを足せます。プラグインは `~/.hermes/plugins/`、プロジェクト内の `.hermes/plugins/`、そして pip でインストールしたエントリーポイントから見つけ出されます。
- **[プラグインを作る](/hermes/docs/developer-guide/plugins/)** — ツール・フック・CLI コマンドを備えた Hermes のプラグインを作るための手順書です。

## 学習と評価 {#training-evaluation}

- **[バッチ処理](/hermes/docs/user-guide/features/batch-processing/)** — 何百ものプロンプトに対してエージェントを並列で走らせ、ShareGPT 形式の構造化された行動データを生成します。学習データの作成や性能の評価に使えます。
