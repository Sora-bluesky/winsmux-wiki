---
title: "外部サービス連携"
description: ""
upstream_path: integrations/index.md
upstream_blob: 370309310c97092ace8b2bcfe252c267c8ed37fc
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations
---

# 外部サービス連携 {#integrations}

Hermes Agent は、AI 推論、ツールサーバー、エディタでの作業、プログラムからの呼び出しなど、さまざまな外部システムとつながります。連携を足すほど、Hermes にできることと動かせる場所が広がります。

:::tip まずはここから
どれか 1 つだけ設定する時間しかないなら、[Nous Portal](/hermes/docs/integrations/nous-portal/) を選んでください。OAuth のログイン 1 回で 300 以上のモデルと、Tool Gateway の 4 つのツール（Web 検索、画像生成、音声合成、ブラウザ操作）がまとめて使えます。
:::

## AI プロバイダーと経路制御 {#ai-providers-routing}

Hermes は複数の AI 推論プロバイダーに最初から対応しています。`hermes model` を使えば対話形式で設定でき、`config.yaml` に直接書くこともできます。

- **[AI プロバイダー](/hermes/docs/integrations/providers/)** — OpenRouter、Anthropic、OpenAI、Google、そして OpenAI 互換のエンドポイント全般です。画像認識・ストリーミング・ツール利用といった機能に対応しているかどうかを、Hermes がプロバイダーごとに自動で判別します。
- **[プロバイダーの経路制御](/hermes/docs/user-guide/features/provider-routing/)** — OpenRouter へのリクエストを実際にどのプロバイダーが処理するかを細かく指定できます。並び替え、許可リスト、拒否リスト、優先順位の明示によって、費用・速度・品質のどれを取るかを調整できます。
- **[予備のプロバイダー](/hermes/docs/user-guide/features/fallback-providers/)** — 主に使うモデルでエラーが出たとき、控えの LLM プロバイダーへ自動的に切り替えます。メインのモデルの切り替えに加えて、画像認識・圧縮・Web 抽出といった補助処理だけを別に切り替えることもできます。

## ツールサーバー（MCP） {#tool-servers-mcp}

- **[MCP サーバー](/hermes/docs/user-guide/features/mcp/)** — Model Context Protocol を使って、Hermes を外部のツールサーバーにつなぎます。GitHub、データベース、ファイルシステム、ブラウザ基盤、社内 API などのツールを、Hermes 用のツールを書かずに呼び出せます。stdio と SSE の両方の通信方式に対応し、サーバーごとのツールの絞り込みや、機能に応じたリソース・プロンプトの登録もできます。

## Web 検索のバックエンド {#web-search-backends}

`web_search` と `web_extract` の 2 つのツールは 8 種類のバックエンドに対応していて、`config.yaml` か `hermes tools` で設定します。

| バックエンド | 環境変数 | 検索 | 抽出 | クロール |
|---------|---------|--------|---------|-------|
| **Firecrawl**（既定） | `FIRECRAWL_API_KEY` | ✔ | ✔ | ✔ |
| **SearXNG** | `SEARXNG_URL` | ✔ | — | — |
| **Brave**（無料枠） | `BRAVE_SEARCH_API_KEY` | ✔ | — | — |
| **DuckDuckGo**（ddgs） | _(不要)_ | ✔ | — | — |
| **Exa** | `EXA_API_KEY` | ✔ | ✔ | — |
| **Parallel** | `PARALLEL_API_KEY` | ✔ | ✔ | — |
| **xAI** | `XAI_API_KEY` | ✔ | — | — |

設定の例です。

```yaml
web:
  backend: firecrawl    # firecrawl | searxng | brave-free | ddgs | tavily | perplexity | keenable | exa | parallel | xai
```

`web.backend` を書かなかった場合は、用意されている API キーからバックエンドを自動で判別します。自分で立てた Firecrawl も `FIRECRAWL_API_URL` で使えます。

## ブラウザ操作 {#browser-automation}

Hermes にはブラウザを操作する機能が一式そろっていて、サイトの閲覧・フォームの入力・情報の取り出しを、次のいずれかの方式で行えます。

- **Browser Use Cloud** — 検出されにくい設定の Chromium を提供するサービスです。住宅用プロキシ、CAPTCHA の突破、使い回せるブラウザプロファイルが付きます
- **Browserbase** — もう 1 つのクラウドブラウザです。管理されたブラウザ、ボット検出対策、CAPTCHA の突破、住宅用プロキシがそろっています
- **手元の Chromium 系ブラウザ（CDP 接続）** — いま動かしている Chrome、Brave、Chromium、Edge に `/browser connect` でつなぎます
- **手元の Chromium** — `agent-browser` コマンドで画面を出さずに動かします

設定と使い方は [ブラウザ操作](/hermes/docs/user-guide/features/browser/) を見てください。

## 音声と読み上げのプロバイダー {#voice-tts-providers}

読み上げ（TTS）と文字起こし（STT）は、すべてのメッセージングサービスで使えます。

| プロバイダー | 品質 | 費用 | API キー |
|----------|---------|------|---------|
| **Edge TTS**（既定） | 良好 | 無料 | 不要 |
| **ElevenLabs** | 非常に良い | 有料 | `ELEVENLABS_API_KEY` |
| **OpenAI TTS** | 良好 | 有料 | `VOICE_TOOLS_OPENAI_KEY` |
| **MiniMax** | 良好 | 有料 | `MINIMAX_API_KEY` |
| **xAI TTS** | 良好 | 有料 | `XAI_API_KEY` |
| **NeuTTS** | 良好 | 無料 | 不要 |

文字起こしは 8 つのプロバイダーに対応しています。手元で動く faster-whisper（無料・端末内で処理）、任意のコマンドを呼び出す方式、Groq、OpenAI Whisper API、Mistral、xAI、ElevenLabs Scribe、DeepInfra です。音声メッセージの文字起こしは Telegram、Discord、WhatsApp などのメッセージングサービスで使えます。詳しくは [音声と読み上げ](/hermes/docs/user-guide/features/tts/) と [音声モード](/hermes/docs/user-guide/features/voice-mode/) を見てください。

## エディタとの連携 {#ide-editor-integration}

- **[エディタ連携（ACP）](/hermes/docs/user-guide/features/acp/)** — VS Code、Zed、JetBrains など ACP に対応したエディタの中で Hermes Agent を使えます。Hermes が ACP サーバーとして動き、会話のやりとり、ツールの実行状況、ファイルの差分、ターミナルのコマンドをエディタ内に表示します。

## プログラムからの利用 {#programmatic-access}

- **[API サーバー](/hermes/docs/user-guide/features/api-server/)** — Hermes を OpenAI 互換の HTTP エンドポイントとして公開します。OpenAI の形式を扱えるフロントエンド（Open WebUI、LobeChat、LibreChat、NextChat、ChatBox）なら、そのまま接続して Hermes を全ツール付きのバックエンドとして使えます。

## 記憶と個人向けの調整 {#memory-personalization}

- **[組み込みのメモリ](/hermes/docs/user-guide/features/memory/)** — `MEMORY.md` と `USER.md` に、選び抜いた内容を残していく仕組みです。エージェントが個人的なメモと利用者の情報を上限付きで管理し、セッションをまたいで持ち越します。
- **[メモリのプロバイダー](/hermes/docs/user-guide/features/memory-providers/)** — 外部の記憶サービスをつないで、より深く個人に合わせられます。対応は 8 つで、Honcho（対話的な推論）、OpenViking（段階的な検索）、Mem0（クラウドでの抽出）、Hindsight（知識グラフ）、Holographic（手元の SQLite）、RetainDB（ハイブリッド検索）、ByteRover（コマンド方式）、Supermemory です。

## メッセージングサービス {#messaging-platforms}

Hermes は 27 以上のメッセージングサービスでボットとして動きます。設定はすべて同じ `gateway` の仕組みで行います。

- **[Telegram](/hermes/docs/user-guide/messaging/telegram/)**, **[Discord](/hermes/docs/user-guide/messaging/discord/)**, **[Slack](/hermes/docs/user-guide/messaging/slack/)**, **[WhatsApp](/hermes/docs/user-guide/messaging/whatsapp/)**, **[Signal](/hermes/docs/user-guide/messaging/signal/)**, **[Matrix](/hermes/docs/user-guide/messaging/matrix/)**, **[Mattermost](/hermes/docs/user-guide/messaging/mattermost/)**, **[メール](/hermes/docs/user-guide/messaging/email/)**, **[SMS](/hermes/docs/user-guide/messaging/sms/)**, **[DingTalk](/hermes/docs/user-guide/messaging/dingtalk/)**, **[Feishu/Lark](/hermes/docs/user-guide/messaging/feishu/)**, **[WeCom](/hermes/docs/user-guide/messaging/wecom/)**, **[WeCom コールバック](/hermes/docs/user-guide/messaging/wecom-callback/)**, **[Weixin](/hermes/docs/user-guide/messaging/weixin/)**, **[BlueBubbles](/hermes/docs/user-guide/messaging/bluebubbles/)**, **[Buzz](/hermes/docs/user-guide/messaging/buzz/)**, **[QQ Bot](/hermes/docs/user-guide/messaging/qqbot/)**, **[Yuanbao](/hermes/docs/user-guide/messaging/yuanbao/)**, **[Home Assistant](/hermes/docs/user-guide/messaging/homeassistant/)**, **[Microsoft Teams](/hermes/docs/user-guide/messaging/teams/)**, **[Microsoft Teams 会議](/hermes/docs/user-guide/messaging/teams-meetings/)**, **[Microsoft Graph Webhook](/hermes/docs/user-guide/messaging/msgraph-webhook/)**, **[Google Chat](/hermes/docs/user-guide/messaging/google_chat/)**, **[LINE](/hermes/docs/user-guide/messaging/line/)**, **[ntfy](/hermes/docs/user-guide/messaging/ntfy/)**, **[SimpleX](/hermes/docs/user-guide/messaging/simplex/)**, **[Open WebUI](/hermes/docs/user-guide/messaging/open-webui/)**, **[Webhook](/hermes/docs/user-guide/messaging/webhooks/)**

サービスごとの比較表と設定手順は [メッセージングゲートウェイの概要](/hermes/docs/user-guide/messaging/) にまとめてあります。

### 作成画面への近道 {#quick-connect-links}

主要なサービスには「ボットやアプリを作る」ための決まった URL があり、パラメータを付けると目的のフォームが開いた状態で始められるものもあります。管理画面を探し回らずに、ここから直接どうぞ。

| サービス | 直リンク | 開く画面 |
|----------|-------------|---------------|
| **Telegram** | [t.me/BotFather](https://t.me/BotFather) | BotFather とのチャットです。`/newbot` を送るとボットのトークンが発行されます |
| **Discord** | [discord.com/developers/applications?new_application=true](https://discord.com/developers/applications?new_application=true) | 開発者ポータルが **New Application** のダイアログを開いた状態で表示されます |
| **Slack** | [api.slack.com/apps?new_app=1](https://api.slack.com/apps?new_app=1) | **Create New App** のダイアログです。*From an app manifest* を選び、`hermes slack manifest --agent-view` が出力するマニフェストを貼り付けます |
| **LINE** | [developers.line.biz/console](https://developers.line.biz/console/) | Messaging API のチャネルを作る LINE Developers Console です |
| **Feishu/Lark** | [open.feishu.cn/app](https://open.feishu.cn/app) | 独自アプリを作る Feishu のオープンプラットフォーム管理画面です |

たどり着いたあとの手順は、サービスごとの設定ページで説明しています。

## 共同作業の場 {#collaboration-workspaces}

- **[Buzz](/hermes/docs/integrations/buzz/)** — Block が作った、Nostr をもとにした人とエージェントの共同作業スペースです。つなぎ方は 3 通りあります。Buzz Desktop が Hermes を ACP のランタイムとして起動する方法、`buzz-acp` の中継ブリッジがサーバー側で Hermes の身元を持つ方法、そしてメッセージングの仕組みとして Buzz のチャンネルに参加し、Hermes のメモリ・スキル・承認・定期実行をそのまま使う方法です。概要ページで 3 つを比べています。

## 家電の操作 {#home-automation}

- **[Home Assistant](/hermes/docs/user-guide/messaging/homeassistant/)** — 4 つの専用ツール（`ha_list_entities`、`ha_get_state`、`ha_list_services`、`ha_call_service`）でスマート家電を操作します。`HASS_TOKEN` を設定すると Home Assistant のツール一式が自動で有効になります。

## プラグイン {#plugins}

- **[プラグインの仕組み](/hermes/docs/user-guide/features/plugins/)** — 本体のコードに手を入れずに、独自のツール・ライフサイクルのフック・コマンドを足せます。プラグインは `~/.hermes/plugins/`、プロジェクト内の `.hermes/plugins/`、pip で入れたエントリポイントから読み込まれます。
- **[プラグインを作る](/hermes/docs/developer-guide/plugins/)** — ツール・フック・コマンドを備えた Hermes のプラグインを、順を追って作っていく手引きです。

## 学習と評価 {#training-evaluation}

- **[一括処理](/hermes/docs/user-guide/features/batch-processing/)** — 何百件ものプロンプトに対してエージェントを並列で走らせ、ShareGPT 形式の実行記録を作ります。学習データの生成や評価に使えます。
