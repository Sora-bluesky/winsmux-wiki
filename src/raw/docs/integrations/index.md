---
title: "連携"
description: ""
upstream_path: integrations/index.md
upstream_blob: 37bac9d8bfcc7766118fc62982f88d56ecc4d320
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations
---

# 連携 {#integrations}

Hermes Agent は、AI の推論、ツールのサーバー、IDE での作業、プログラムからの利用など、いろいろな外部の仕組みとつながります。こうした連携は、Hermes にできることと、Hermes が動ける場所を広げてくれます。

:::tip まずはここから
連携をひとつだけ設定する時間しかないなら、[Nous Portal](/hermes/docs/integrations/nous-portal/) にしてください。OAuth のログイン 1 回で 300 を超えるモデルと、Tool Gateway の 4 つのツール（Web 検索、画像生成、TTS、ブラウザの自動操作）が使えるようになります。
:::

## AI のプロバイダと振り分け {#ai-providers-routing}

Hermes は、はじめから複数の AI 推論プロバイダに対応しています。対話的に設定するなら `hermes model` を使い、そうでなければ `config.yaml` に書きます。

- **[AI のプロバイダ](/hermes/docs/integrations/providers/)** — OpenRouter、Anthropic、OpenAI、Google、そして OpenAI 互換のエンドポイントならどれでも使えます。画像の読み取り、逐次の応答、ツールの利用といった対応状況は、プロバイダごとに Hermes が自動で判別します。
- **[プロバイダの振り分け](/hermes/docs/user-guide/features/provider-routing/)** — OpenRouter への要求を、その下のどのプロバイダが処理するかを細かく決められます。並べ替え、許可リスト、除外リスト、優先順位の明示によって、費用、速さ、品質のどれを重んじるかを調整できます。
- **[代わりのプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)** — 主に使っているモデルでエラーが出たとき、控えの LLM のプロバイダへ自動で切り替えます。メインのモデルの切り替えに加え、画像の読み取り、圧縮、Web からの抽出といった補助のタスクについても、独立して切り替えられます。

## ツールのサーバー（MCP） {#tool-servers-mcp}

- **[MCP のサーバー](/hermes/docs/user-guide/features/mcp/)** — Model Context Protocol を通して、Hermes を外部のツールのサーバーにつなぎます。GitHub、データベース、ファイルシステム、ブラウザ関連、社内の API などのツールを、Hermes 本体のツールを書かずに使えます。stdio と SSE の両方の通信方式、サーバーごとのツールの絞り込み、対応状況を踏まえたリソースやプロンプトの登録に対応します。

## Web 検索のバックエンド {#web-search-backends}

`web_search` と `web_extract` のツールは 8 つのバックエンドのプロバイダに対応しており、`config.yaml` か `hermes tools` で設定します。

| バックエンド | 環境変数 | 検索 | 抽出 | クロール |
|---------|---------|--------|---------|-------|
| **Firecrawl**（既定） | `FIRECRAWL_API_KEY` | ✔ | ✔ | ✔ |
| **SearXNG** | `SEARXNG_URL` | ✔ | — | — |
| **Brave**（無料枠） | `BRAVE_SEARCH_API_KEY` | ✔ | — | — |
| **DuckDuckGo**（ddgs） | _(なし)_ | ✔ | — | — |
| **Exa** | `EXA_API_KEY` | ✔ | ✔ | — |
| **Parallel** | `PARALLEL_API_KEY` | ✔ | ✔ | — |
| **xAI** | `XAI_API_KEY` | ✔ | — | — |

手早い設定の例です。

```yaml
web:
  backend: firecrawl    # firecrawl | searxng | brave-free | ddgs | tavily | keenable | exa | parallel | xai
```

`web.backend` を設定していない場合、使える API キーからバックエンドが自動で判別されます。`FIRECRAWL_API_URL` を使えば、自分で立てた Firecrawl も使えます。

## ブラウザの自動操作 {#browser-automation}

Hermes には、サイトをたどり、フォームを埋め、情報を取り出すためのブラウザの自動操作がひととおり入っており、バックエンドをいくつかから選べます。

- **Browser Use Cloud** — 検知されにくい設定、住宅用のプロキシ、CAPTCHA の突破、使い回せるブラウザのプロファイルを備えた、運用込みの Chromium です
- **Browserbase** — もうひとつのクラウドのブラウザのプロバイダです。運用込みのブラウザ、ボット検知への対策、CAPTCHA の突破、住宅用のプロキシを備えています
- **ローカルの Chromium 系の CDP** — 動いている Chrome、Brave、Chromium、Edge に `/browser connect` でつなぎます
- **ローカルの Chromium** — `agent-browser` の CLI を使った、画面のないローカルのブラウザです

設定と使い方は [ブラウザの自動操作](/hermes/docs/user-guide/features/browser/) を見てください。

## 音声と TTS のプロバイダ {#voice-tts-providers}

どのメッセージングプラットフォームでも、文章の読み上げと音声の文字起こしが使えます。

| プロバイダ | 品質 | 費用 | API キー |
|----------|---------|------|---------|
| **Edge TTS**（既定） | 良好 | 無料 | 不要 |
| **ElevenLabs** | 非常に良い | 有料 | `ELEVENLABS_API_KEY` |
| **OpenAI TTS** | 良好 | 有料 | `VOICE_TOOLS_OPENAI_KEY` |
| **MiniMax** | 良好 | 有料 | `MINIMAX_API_KEY` |
| **xAI TTS** | 良好 | 有料 | `XAI_API_KEY` |
| **NeuTTS** | 良好 | 無料 | 不要 |

音声の文字起こしは 8 つのプロバイダに対応します。ローカルの faster-whisper（無料で、手元の端末で動きます）、ローカルのコマンドを包んだもの、Groq、OpenAI Whisper API、Mistral、xAI、ElevenLabs Scribe、DeepInfra です。音声メッセージの文字起こしは、Telegram、Discord、WhatsApp をはじめ、どのメッセージングプラットフォームでも使えます。詳しくは [音声と TTS](/hermes/docs/user-guide/features/tts/) と [音声モード](/hermes/docs/user-guide/features/voice-mode/) を見てください。

## IDE・エディタとの連携 {#ide-editor-integration}

- **[IDE との連携（ACP）](/hermes/docs/user-guide/features/acp/)** — VS Code、Zed、JetBrains など、ACP に対応したエディタの中で Hermes Agent を使えます。Hermes は ACP のサーバーとして動き、チャットのメッセージ、ツールの動き、ファイルの差分、ターミナルのコマンドをエディタの中に表示します。

## プログラムからの利用 {#programmatic-access}

- **[API サーバー](/hermes/docs/user-guide/features/api-server/)** — Hermes を OpenAI 互換の HTTP のエンドポイントとして公開します。OpenAI の形式を話せるフロントエンドなら何でも — Open WebUI、LobeChat、LibreChat、NextChat、ChatBox — つないで、道具立てをそのまま備えた Hermes をバックエンドとして使えます。

## 記憶と個人化 {#memory-personalization}

- **[組み込みの記憶](/hermes/docs/user-guide/features/memory/)** — `MEMORY.md` と `USER.md` のファイルによる、手入れの行き届いた消えない記憶です。エージェントは、個人的なメモとユーザーの情報を、大きさの決まった置き場で管理し、セッションをまたいで保ちます。
- **[記憶のプロバイダ](/hermes/docs/user-guide/features/memory-providers/)** — もっと深く個人化するために、外部の記憶のバックエンドを差し込めます。対応しているのは 8 つです。Honcho（対話的な推論）、OpenViking（段階的な取り出し）、Mem0（クラウドでの抽出）、Hindsight（知識のグラフ）、Holographic（ローカルの SQLite）、RetainDB（複合的な検索）、ByteRover（CLI を土台にしたもの）、Supermemory です。

## メッセージングプラットフォーム {#messaging-platforms}

Hermes は 27 を超えるメッセージングプラットフォームでゲートウェイのボットとして動き、どれも同じ `gateway` の仕組みで設定します。

- **[Telegram](/hermes/docs/user-guide/messaging/telegram/)**、**[Discord](/hermes/docs/user-guide/messaging/discord/)**、**[Slack](/hermes/docs/user-guide/messaging/slack/)**、**[WhatsApp](/hermes/docs/user-guide/messaging/whatsapp/)**、**[Signal](/hermes/docs/user-guide/messaging/signal/)**、**[Matrix](/hermes/docs/user-guide/messaging/matrix/)**、**[Mattermost](/hermes/docs/user-guide/messaging/mattermost/)**、**[メール](/hermes/docs/user-guide/messaging/email/)**、**[SMS](/hermes/docs/user-guide/messaging/sms/)**、**[DingTalk](/hermes/docs/user-guide/messaging/dingtalk/)**、**[Feishu/Lark](/hermes/docs/user-guide/messaging/feishu/)**、**[WeCom](/hermes/docs/user-guide/messaging/wecom/)**、**[WeCom Callback](/hermes/docs/user-guide/messaging/wecom-callback/)**、**[Weixin](/hermes/docs/user-guide/messaging/weixin/)**、**[BlueBubbles](/hermes/docs/user-guide/messaging/bluebubbles/)**、**[Buzz](/hermes/docs/user-guide/messaging/buzz/)**、**[QQ Bot](/hermes/docs/user-guide/messaging/qqbot/)**、**[Yuanbao](/hermes/docs/user-guide/messaging/yuanbao/)**、**[Home Assistant](/hermes/docs/user-guide/messaging/homeassistant/)**、**[Microsoft Teams](/hermes/docs/user-guide/messaging/teams/)**、**[Microsoft Teams Meetings](/hermes/docs/user-guide/messaging/teams-meetings/)**、**[Microsoft Graph Webhook](/hermes/docs/user-guide/messaging/msgraph-webhook/)**、**[Google Chat](/hermes/docs/user-guide/messaging/google_chat/)**、**[LINE](/hermes/docs/user-guide/messaging/line/)**、**[ntfy](/hermes/docs/user-guide/messaging/ntfy/)**、**[SimpleX](/hermes/docs/user-guide/messaging/simplex/)**、**[Open WebUI](/hermes/docs/user-guide/messaging/open-webui/)**、**[Webhooks](/hermes/docs/user-guide/messaging/webhooks/)**

プラットフォームの比較表と設定の手引きは [メッセージングゲートウェイの概要](/hermes/docs/user-guide/messaging/) を見てください。

### 手早くつなぐためのリンク {#quick-connect-links}

大きなプラットフォームには「ボットやアプリを作る」ための決まった URL があり、一部は正しいフォームを最初から開くための引数も受け取れます。管理画面を探し回らず、直接そこへ行きましょう。

| プラットフォーム | 直接のリンク | 何が開くか |
|----------|-------------|---------------|
| **Telegram** | [t.me/BotFather](https://t.me/BotFather) | BotFather とのチャット。`/newbot` を送るとボットのトークンが作られます |
| **Discord** | [discord.com/developers/applications?new_application=true](https://discord.com/developers/applications?new_application=true) | **New Application** のダイアログが開いた状態の開発者ポータル |
| **Slack** | [api.slack.com/apps?new_app=1](https://api.slack.com/apps?new_app=1) | **Create New App** のダイアログ。*From an app manifest* を選び、`hermes slack manifest --agent-view` が出力するマニフェストを貼り付けます |
| **LINE** | [developers.line.biz/console](https://developers.line.biz/console/) | Messaging API のチャンネルを作るための LINE Developers Console |
| **Feishu/Lark** | [open.feishu.cn/app](https://open.feishu.cn/app) | 独自アプリを作るための Feishu のオープンプラットフォームの管理画面 |

そこへ着いたあと何をするかは、プラットフォームごとの設定のページが案内します。

## 共同作業の場 {#collaboration-workspaces}

- **[Buzz](/hermes/docs/integrations/buzz/)** — Block による、Nostr を土台にした人とエージェントの作業の場です。つなぎ方は 3 通りあります。Buzz Desktop が Hermes を管理下の ACP の実行環境として立ち上げる方法、`buzz-acp` の中継の橋渡しがサーバー側で Hermes の身元をもたせる方法、そしてゲートウェイのプラットフォームがそのまま Buzz のチャンネルに参加し、Hermes の記憶・スキル・承認・cron をすべて持ち込む方法です。概要のページで 3 つを比べています。

## 家の自動化 {#home-automation}

- **[Home Assistant](/hermes/docs/user-guide/messaging/homeassistant/)** — 4 つの専用のツール（`ha_list_entities`、`ha_get_state`、`ha_list_services`、`ha_call_service`）でスマートホームの機器を操作します。`HASS_TOKEN` を設定すると、Home Assistant のツールセットが自動で有効になります。

## プラグイン {#plugins}

- **[プラグインの仕組み](/hermes/docs/user-guide/features/plugins/)** — 本体のコードに手を入れずに、独自のツール、動作の節目に挟むフック、CLI のコマンドで Hermes を広げられます。プラグインは `~/.hermes/plugins/`、プロジェクトごとの `.hermes/plugins/`、そして pip で入れたエントリーポイントから見つかります。
- **[プラグインを作る](/hermes/docs/developer-guide/plugins/)** — ツール、フック、CLI のコマンドを備えた Hermes のプラグインを作るための、順を追った手引きです。

## 学習と評価 {#training-evaluation}

- **[まとめての処理](/hermes/docs/user-guide/features/batch-processing/)** — 何百というプロンプトに対してエージェントを並行して走らせ、学習データの生成や評価に使える ShareGPT 形式の行動記録を整った形で作ります。
