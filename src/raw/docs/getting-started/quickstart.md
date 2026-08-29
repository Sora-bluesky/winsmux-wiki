---
title: "Hermes Agent クイックスタート"
description: "Hermes Agent との最初の会話まで — インストールからチャット開始まで5分以内"
upstream_path: getting-started/quickstart.md
upstream_blob: e0772f02be46ff0934ba3f840ea974ba006e9c92
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
---

# Hermes Agent クイックスタート {#hermes-agent-quickstart}

このガイドは、ゼロの状態から実用に耐える Hermes 環境までを一気に立ち上げるためのものです。インストールし、プロバイダーを選び、チャットが動くことを確かめ、うまくいかないときに何をすればいいかまで押さえます。

## 動画で見たい方へ {#prefer-to-watch}

**Onchain AI Garage** が、インストール・セットアップ・基本コマンドをひと通りたどるマスタークラス動画を公開しています。動画を見ながら進めたい方には、このページの良い相棒になります。ほかの動画は [Hermes Agent Tutorials & Use Cases](https://www.youtube.com/playlist?list=PLmpUb_PWAkDxewld5ZYyKifuHxgIbiq2d) のプレイリストにまとまっています。

[YouTube: https://www.youtube-nocookie.com/embed/R3YOGfTBcQg](https://www.youtube-nocookie.com/embed/R3YOGfTBcQg)

## こんな方に {#who-this-is-for}

- まったくの初めてで、動く状態までの最短ルートを知りたい
- プロバイダーを乗り換えるところで、設定ミスに時間を取られたくない
- チーム用・ボット用・常時稼働の用途で Hermes を用意したい
- 「入ったはいいが、何も起きない」状態にうんざりしている

## いちばん速い進め方 {#the-fastest-path}

目的に合う行を選んでください。

| 目的 | まずこれ | 次にこれ |
|---|---|---|
| とにかく自分の端末で Hermes を動かしたい | `hermes setup` | 実際にチャットして、返事が返ることを確かめる |
| 使うプロバイダーはもう決まっている | `hermes model` | 設定を保存して、チャットを始める |
| ボットや常時稼働の構成にしたい | CLI が動いてから `hermes gateway setup` | Telegram、Discord、Slack などのプラットフォームにつなぐ |
| ローカルまたは自前ホストのモデルを使いたい | `hermes model` → カスタムエンドポイント | エンドポイント、モデル名、コンテキスト長を確認する |
| 複数プロバイダーのフォールバックを組みたい | まず `hermes model` | 素のチャットが動いてから、ルーティングとフォールバックを足す |

**目安:** Hermes が普通のチャットすらこなせない状態なら、まだ機能を足さないでください。まずきれいな会話をひとつ成立させ、そのうえでゲートウェイ、cron、スキル、音声、ルーティングを重ねていきます。

---

## 1. Hermes Agent をインストールする {#1-install-hermes-agent}
### macOS / Windows で Hermes Desktop インストーラーを使う（推奨） {#with-the-hermes-desktop-installer-on-macos-or-windows-recommended}
コマンドラインとデスクトップの両方を手軽に入れるなら、公式サイトから [Hermes Desktop インストーラーをダウンロード](https://hermes-agent.nousresearch.com/)して実行してください。

### Hermes Desktop を使わない場合 {#without-hermes-desktop}
Hermes Desktop なしで、コマンドラインだけを入れる場合は次を実行します。

#### Linux / macOS / WSL2 / Android（Termux） {#linux-macos-wsl2-android-termux}
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

#### Windows（ネイティブ） {#windows-native}

PowerShell で実行します。
```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1) 
```

:::tip Android / Termux
スマートフォンに入れる場合は、動作確認済みの手動手順、対応している追加機能、現時点の Android 固有の制限をまとめた [Termux ガイド](/hermes/docs/getting-started/termux/) を参照してください。
:::

完了したら、シェルを読み込み直します。

```bash
source ~/.bashrc   # or source ~/.zshrc
```

インストールの詳しい選択肢、前提条件、トラブル対応は [インストールガイド](/hermes/docs/getting-started/installation/) にあります。

## 2. プロバイダーを選ぶ {#2-choose-a-provider}

セットアップで最も重要な工程です。`hermes model` を実行すると、対話形式で選んでいけます。

```bash
hermes model
```

:::tip いちばん簡単な道: Nous Portal
ひとつのサブスクリプションで 300 以上のモデルに加えて [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)（Web 検索、画像生成、TTS、クラウドブラウザ）まで使えます。入れたばかりの環境なら次のとおりです。

```bash
hermes setup --portal
```

このコマンドひとつでログインし、プロバイダーを Nous に設定し、Tool Gateway を有効にします。
:::

:::info セットアップのモード
入れたばかりの環境では、`hermes setup` が3つのモードを提示します。

- **Quick Setup（Nous Portal）** — 無料の OAuth ログインで、API キーは不要。モデルと Tool Gateway のツールをまとめて用意します。おすすめの最短ルートです。
- **Full Setup** — プロバイダー、ツール、オプションを自分でひと通り設定していきます（キーは自分で用意）。
- **Blank Slate** — エージェントを動かすのに最低限必要なもの、つまり **プロバイダーとモデル、File Operations ツールセット、Terminal ツールセット** 以外はすべて **オフ** で始まります。Web、ブラウザ、コード実行、画像認識、メモリ、委譲、cron、スキル、プラグイン、MCP サーバーはどれも入らず、圧縮・チェックポイント・スマートルーティング・メモリ取得も無効です。この最小構成を適用したあと、2つの道から選びます。**すべて無効のまま始める**（最小構成のエージェントでここで終える）か、**すべての設定を順に見ていく**（ツール、スキル、プラグイン、MCP、メッセージングを必要なぶんだけ有効にする）かです。最小限で完全に制御されたエージェントを作り、必要なものだけを自分で有効にしたいときはこれを選びます。

Blank Slate は `platform_toolsets.cli` の明示的なリストと `agent.disabled_toolsets` を書き出すので、自分で選んでいないものは決して読み込まれません。`hermes update` のあとでも同じです。あとから有効にしたいときは `hermes tools`、スキルを入れたいときは `hermes skills opt-in --sync`、設定を調整したいときは `hermes setup agent` を使います。
:::

無難な選択肢は次のとおりです。

| プロバイダー | どんなものか | 設定方法 |
|----------|-----------|---------------|
| **Nous Portal** | サブスクリプション型。設定不要 | `hermes model` から OAuth ログイン |
| **OpenAI Codex** | ChatGPT または Codex のサブスクリプション。Codex のモデルを使う | `hermes model` → **ChatGPT or Codex Subscription** でデバイスコード認証 |
| **Anthropic** | Claude のモデルを直接利用。Max プラン＋追加クレジット（OAuth）か、従量課金の API キー | `hermes model` → OAuth ログイン（Max ＋追加クレジットが必要）、または Anthropic の API キー |
| **OpenRouter** | 多数のモデルをまたぐマルチプロバイダールーティング | API キーを入力 |
| **Fireworks AI** | OpenAI 互換のモデル API を直接利用 | `FIREWORKS_API_KEY` を設定 |
| **Z.AI** | GLM / Zhipu がホストするモデル | `GLM_API_KEY` / `ZAI_API_KEY` を設定（`Z_AI_API_KEY` も可） |
| **Kimi / Moonshot** | Moonshot がホストするコーディング・チャット向けモデル | `KIMI_API_KEY` を設定（Kimi Coding 専用の `KIMI_CODING_API_KEY` も可） |
| **Kimi / Moonshot China** | 中国リージョンの Moonshot エンドポイント | `KIMI_CN_API_KEY` を設定 |
| **Arcee AI** | Trinity のモデル | `ARCEEAI_API_KEY` を設定 |
| **GMI Cloud** | 複数モデルを直接叩く API | `GMI_API_KEY` を設定 |
| **Actual Computer** | 手元のハードウェアを専用の推論クラスターとして使う。ホスト型リレーかローカルデーモン | `ACTUAL_API_KEY`（リレー）または `ACTUAL_BASE_URL=http://127.0.0.1:8080`（ローカル、キー不要）を設定 |
| **MiniMax (OAuth)** | ブラウザ OAuth で MiniMax のフロンティアモデルを使う。API キー不要（`hermes_cli/models.py` のモデル名はリリースごとに変わることがあります） | `hermes model` → MiniMax (OAuth) |
| **MiniMax** | 国際版の MiniMax エンドポイント | `MINIMAX_API_KEY` を設定 |
| **MiniMax China** | 中国リージョンの MiniMax エンドポイント | `MINIMAX_CN_API_KEY` を設定 |
| **Alibaba Cloud** | DashScope 経由の Qwen モデル | `DASHSCOPE_API_KEY` を設定（Qwen Coding Plan は `ALIBABA_CODING_PLAN_API_KEY` も可） |
| **Hugging Face** | 統合ルーター経由で 20 以上のオープンモデル（Qwen、DeepSeek、Kimi など） | `HF_TOKEN` を設定 |
| **AWS Bedrock** | ネイティブの Converse API 経由で Claude、Nova、Llama、DeepSeek | IAM ロールまたは `aws configure`（[ガイド](/hermes/docs/guides/aws-bedrock/)） |
| **Azure Foundry** | Azure AI Foundry がホストするモデル | `AZURE_FOUNDRY_API_KEY` ＋ `AZURE_FOUNDRY_BASE_URL` を設定 |
| **Google AI Studio** | 直接 API 経由の Gemini モデル | `GOOGLE_API_KEY` / `GEMINI_API_KEY` を設定 |
| **xAI** | 直接 API 経由の Grok モデル | `XAI_API_KEY` を設定 |
| **xAI Grok OAuth** | SuperGrok / Premium+ のサブスクリプション。API キー不要 | `hermes model` → xAI Grok OAuth |
| **NovitaAI** | 複数モデルの API ゲートウェイ | `NOVITA_API_KEY` を設定 |
| **Ramp Router** | OpenAI / Anthropic / xAI などをまたぐ Responses ネイティブの LLM ゲートウェイ | `RAMP_ROUTER_API_KEY` を設定 |
| **Nebius Token Factory** | Nebius AI クラウド上のオープンモデル | `NEBIUS_API_KEY` を設定 |
| **StepFun** | Step Plan のモデル | `STEPFUN_API_KEY` を設定 |
| **Xiaomi MiMo** | Xiaomi がホストするモデル | `XIAOMI_API_KEY` を設定 |
| **Tencent TokenHub** | Tencent がホストするモデル | `TOKENHUB_API_KEY` を設定 |
| **Tencent TokenPlan** | Anthropic 形式のエンドポイント経由で Tencent Hy のモデル | `TOKENPLAN_API_KEY` を設定 |
| **Ollama Cloud** | マネージドの Ollama ホスト型モデル | `OLLAMA_API_KEY` を設定 |
| **LM Studio** | OpenAI 互換 API を公開するローカルのデスクトップアプリ | `LM_API_KEY` を設定（既定以外なら `LM_BASE_URL` も） |
| **Qwen OAuth** | Qwen Portal のブラウザ OAuth。API キー不要 | `hermes model` → Qwen OAuth |
| **Kilo Code** | KiloCode がホストするモデル | `KILOCODE_API_KEY` を設定 |
| **OpenCode Zen** | 厳選されたモデルへの従量課金アクセス | `OPENCODE_ZEN_API_KEY` を設定 |
| **OpenCode Go** | オープンモデル向けの月額 10 ドルのサブスクリプション | `OPENCODE_GO_API_KEY` を設定 |
| **DeepSeek** | DeepSeek API への直接アクセス | `DEEPSEEK_API_KEY` を設定 |
| **NVIDIA NIM** | build.nvidia.com またはローカル NIM 経由の Nemotron モデル | `NVIDIA_API_KEY` を設定（任意で `NVIDIA_BASE_URL`） |
| **GitHub Copilot** | GitHub Copilot のサブスクリプション（GPT-5.x、Claude、Gemini など） | `hermes model` からの OAuth、または `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` |
| **GitHub Copilot ACP** | Copilot の ACP エージェントバックエンド（ローカルの `copilot` CLI を起動） | `hermes model`（`copilot` CLI と `copilot login` が必要） |
| **Vercel AI Gateway** | Vercel AI Gateway によるルーティング | `AI_GATEWAY_API_KEY` を設定 |
| **Custom Endpoint** | VLLM、SGLang、Ollama など、OpenAI 互換の API 全般 | ベース URL と API キーを設定 |

初めての方はたいてい、プロバイダーを選んだら、変える理由がはっきりしない限り既定値のままで問題ありません。環境変数と設定手順を含むプロバイダーの全一覧は [プロバイダー](/hermes/docs/integrations/providers/) のページにあります。

:::caution 最低コンテキスト長: 64K トークン
Hermes Agent は、コンテキストが最低でも **64,000 トークン** あるモデルを必要とします。これより小さいモデルは、複数ステップのツール呼び出しに必要な作業記憶を保てないため、起動時に弾かれます。ホスト型のモデル（Claude、GPT、Gemini、Qwen、DeepSeek）はたいてい余裕で満たします。ローカルのモデルを動かす場合は、コンテキストサイズを 64K 以上に設定してください（llama.cpp なら `--ctx-size 65536`、Ollama なら `-c 65536` など）。
:::

:::tip
プロバイダーはいつでも `hermes model` で切り替えられます。囲い込みはありません。対応プロバイダーの全一覧と設定の詳細は [AI プロバイダー](/hermes/docs/integrations/providers/) を参照してください。
:::

### 設定の保存先 {#how-settings-are-stored}

Hermes は秘密情報と通常の設定を分けて保存します。

- **秘密情報とトークン** → `~/.hermes/.env`
- **秘密でない設定** → `~/.hermes/config.yaml`

値を正しく設定するいちばん確実な方法は CLI を使うことです。

```bash
hermes config set model anthropic/claude-opus-4.6
hermes config set terminal.backend docker
hermes config set OPENROUTER_API_KEY sk-or-...
```

適切な値が、自動的に適切なファイルへ振り分けられます。

## 3. 最初のチャットを動かす {#3-run-your-first-chat}

```bash
hermes            # classic CLI
hermes --tui      # modern TUI (recommended)
```

モデル、使えるツール、スキルが並んだウェルカムバナーが表示されます。結果を確かめやすい、具体的なプロンプトを投げてみてください。

:::tip 画面を選ぶ
Hermes には2つのターミナル画面が付いています。従来からの `prompt_toolkit` 版 CLI と、モーダル表示・マウス選択・入力を待たせない設計を備えた新しい [TUI](/hermes/docs/user-guide/tui/) です。どちらもセッション、スラッシュコマンド、設定を共有しているので、`hermes` と `hermes --tui` を両方試してみてください。
:::

```
Summarize this repo in 5 bullets and tell me what the main entrypoint is.
```

```
Check my current directory and tell me what looks like the main project file.
```

```
Help me set up a clean GitHub PR workflow for this codebase.
```

**うまくいっているときの状態:**

- バナーに、選んだモデルとプロバイダーが表示される
- Hermes がエラーなく返事をする
- 必要に応じてツール（ターミナル、ファイル読み取り、Web 検索）を使える
- 会話が1往復で終わらず、そのまま続けられる

ここまで動けば、いちばん難しいところは越えています。

## 4. セッションが動くことを確かめる {#4-verify-sessions-work}

先へ進む前に、再開が効くことを確認しておきます。

```bash
hermes --continue    # Resume the most recent session
hermes -c            # Short form
```

これで、いま話していたセッションに戻れるはずです。戻れない場合は、同じプロファイルにいるか、セッションが実際に保存されたかを確認してください。ここは、あとで複数の構成や複数の端末を使い分けるときに効いてきます。

## 5. 主な機能を試す {#5-try-key-features}

### ターミナルを使う {#use-the-terminal}

```
❯ What's my disk usage? Show the top 5 largest directories.
```

エージェントが代わりにターミナルのコマンドを実行し、結果を見せてくれます。

### スラッシュコマンド {#slash-commands}

`/` と打つと、全コマンドの入力補完が出てきます。

| コマンド | 何をするか |
|---------|-------------|
| `/help` | 使えるコマンドをすべて表示する |
| `/tools` | 使えるツールを一覧する |
| `/model` | 対話形式でモデルを切り替える |
| `/personality pirate` | 遊び心のある人格を試す |
| `/save` | 会話を保存する |

### 複数行の入力 {#multi-line-input}

`Alt+Enter`、`Ctrl+J`、`Shift+Enter` のいずれかで改行を入れられます。`Shift+Enter` は、その組み合わせを独立したシーケンスとして送るターミナルが必要です（Kitty / foot / WezTerm / Ghostty は既定で対応、iTerm2 / Alacritty / VS Code のターミナルは Kitty キーボードプロトコルを有効にすれば対応）。`Alt+Enter` と `Ctrl+J` はどのターミナルでも使えます。

### エージェントを止める {#interrupt-the-agent}

エージェントの処理が長すぎると感じたら、新しいメッセージを打って Enter を押してください。いまの作業を中断して、新しい指示に切り替わります。`Ctrl+C` でも止まります。

## 6. 次の層を足す {#6-add-the-next-layer}

素のチャットが動いてからにしてください。必要なものを選びます。

### ボットや共有アシスタント {#bot-or-shared-assistant}

```bash
hermes gateway setup    # Interactive platform configuration
```

[Telegram](/hermes/docs/user-guide/messaging/telegram/)、[Discord](/hermes/docs/user-guide/messaging/discord/)、[Slack](/hermes/docs/user-guide/messaging/slack/)、[WhatsApp](/hermes/docs/user-guide/messaging/whatsapp/)、[Signal](/hermes/docs/user-guide/messaging/signal/)、[メール](/hermes/docs/user-guide/messaging/email/)、[Home Assistant](/hermes/docs/user-guide/messaging/homeassistant/)、[Microsoft Teams](/hermes/docs/user-guide/messaging/teams/) につなげます。

### 自動化とツール {#automation-and-tools}

- `hermes tools` — プラットフォームごとにツールの利用範囲を調整する
- `hermes skills` — 再利用できる手順を探して入れる
- Cron — ボットや CLI の構成が安定してからにする

### サンドボックス化したターミナル {#sandboxed-terminal}

安全のため、エージェントを Docker コンテナやリモートサーバー上で動かせます。

```bash
hermes config set terminal.backend docker    # Docker isolation
hermes config set terminal.backend ssh       # Remote server
```

Docker のサンドボックスでは、**送信時に認証情報を差し込むプロキシ** を有効にして、サンドボックス側に本物の API キーを一切見せない構成もとれます。渡るのは、ローカルの TLS 傍受デーモンの背後でしか通用しない不透明なプロキシトークンだけです。[送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) を参照してください。用意するには `hermes egress setup && hermes egress start` を実行します。`hermes setup terminal` も Docker 利用者にこの機能を案内します。Modal、SSH、Daytona、Singularity はまだ未対応です。

### 音声モード {#voice-mode}

```bash
# From the Hermes install directory (the curl installer placed it at
# ~/.hermes/hermes-agent on Linux/macOS or %LOCALAPPDATA%\hermes\hermes-agent on Windows):
cd ~/.hermes/hermes-agent
uv pip install --python ./venv/bin/python -e ".[voice]"
# Includes faster-whisper for free local speech-to-text
```

そのうえで CLI から `/voice on` を実行します。録音は `Ctrl+B` です。[音声モード](/hermes/docs/user-guide/features/voice-mode/) を参照してください。

### スキル {#skills}

スキルとは、特定の作業のやり方を Hermes に教える、必要なときだけ読み込まれる手順書です。Kubernetes へのデプロイ、GitHub の PR 作成、モデルのファインチューニング、GIF 検索といった具合です。実体は `SKILL.md` というファイルで、名前・説明・手順が書かれています。エージェントは短い説明だけを常に把握しておき、実際に必要になったときにはじめて全文を読み込むので、スキルを増やしても毎回のリクエストが重くなることはありません。

Hermes には、あらかじめ `~/.hermes/skills/` に入った一群のスキルが同梱されています。Skills Hub から追加することも、自分で書くこともできます。

**ハブを見て導入する:**

```bash
hermes skills browse                      # list everything available
hermes skills search kubernetes           # find skills by keyword
hermes skills install openai/skills/k8s   # install one (runs a security scan first)
```

install に渡すのは、ハブ上の `source/path` 形式のスラッグです。`openai/skills/k8s` なら、OpenAI のカタログにある `k8s` スキルを指します。使えるスラッグは `hermes skills browse` で確認できます。

**スキルを使う** — 導入したスキルは、自動的にスラッシュコマンドになります。

```bash
/k8s deploy the staging manifest          # run the skill with a request
/k8s                                       # load it and let Hermes ask what you need
```

これは CLI でも、つないだメッセージングのプラットフォームでも同じように使えます。最初から全部入れておく必要はありません。普通に会話しているなかで作業内容が合致すれば、エージェントが同梱スキルから適切なものを自分で選びます。

自作の方法、外部のスキルディレクトリ、ハブの全ソース一覧は [スキルシステム](/hermes/docs/user-guide/features/skills/) にあります。

### MCP サーバー {#mcp-servers}

```yaml
# Add to ~/.hermes/config.yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxx"
```

### エディタ連携（ACP） {#editor-integration-acp}

ACP 対応は標準の `[all]` エクストラに含まれているので、curl のインストーラーを使ったなら既に入っています。次を実行するだけです。

```bash
hermes acp
```

（`[all]` なしで入れた場合は、先に `cd ~/.hermes/hermes-agent && uv pip install -e ".[acp]"` を実行してください。）

[ACP エディタ連携](/hermes/docs/user-guide/features/acp/) を参照してください。

---

## よくあるつまずき方 {#common-failure-modes}

いちばん時間を溶かしがちなのは、次のような問題です。

| 症状 | 考えられる原因 | 対処 |
|---|---|---|
| Hermes は起動するが、返事が空だったり壊れていたりする | プロバイダーの認証かモデル選択が間違っている | もう一度 `hermes model` を実行して、プロバイダー・モデル・認証を確認する |
| カスタムエンドポイントは「動く」が、返ってくる内容が意味不明 | ベース URL かモデル名が違う、あるいは実際には OpenAI 互換ではない | まず別のクライアントでエンドポイントを確かめる |
| ゲートウェイは起動するが、誰もメッセージを送れない | ボットトークン、許可リスト、プラットフォーム側の設定が途中で止まっている | `hermes gateway setup` をやり直し、`hermes gateway status` を確認する |
| `hermes --continue` が前のセッションを見つけられない | プロファイルを切り替えた、あるいはセッションが保存されていない | `hermes sessions list` を確認し、正しいプロファイルにいるか確かめる |
| モデルが使えない、フォールバックの挙動がおかしい | プロバイダーのルーティングやフォールバックの設定が効きすぎている | 基本のプロバイダーが安定するまで、ルーティングは切っておく |
| `hermes doctor` が設定の問題を指摘する | 設定値が欠けている、または古い | 設定を直し、機能を足す前に素のチャットで再確認する |

## 立て直しの手順 {#recovery-toolkit}

どうも様子がおかしいときは、この順で試してください。

1. `hermes doctor`
2. `hermes model`
3. `hermes setup`
4. `hermes sessions list`
5. `hermes --continue`
6. `hermes gateway status`

この流れをたどれば、「なんだか壊れている」状態から、把握できている状態まで手早く戻れます。

---

## 早見表 {#quick-reference}

| コマンド | 説明 |
|---------|-------------|
| `hermes` | チャットを始める |
| `hermes model` | LLM のプロバイダーとモデルを選ぶ |
| `hermes tools` | プラットフォームごとに有効なツールを設定する |
| `hermes setup` | セットアップウィザード一式（まとめて設定する） |
| `hermes doctor` | 問題を診断する |
| `hermes update` | 最新版に更新する |
| `hermes gateway` | メッセージングのゲートウェイを起動する |
| `hermes --continue` | 直前のセッションを再開する |

## 次に読むもの {#next-steps}

- **[CLI ガイド](/hermes/docs/user-guide/cli/)** — ターミナル画面を使いこなす
- **[設定](/hermes/docs/user-guide/configuration/)** — 自分の環境に合わせて調整する
- **[メッセージングゲートウェイ](/hermes/docs/user-guide/messaging/)** — Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant、Teams などにつなぐ
- **[ツールとツールセット](/hermes/docs/user-guide/features/tools/)** — 使える機能を見て回る
- **[AI プロバイダー](/hermes/docs/integrations/providers/)** — プロバイダーの全一覧と設定の詳細
- **[スキルシステム](/hermes/docs/user-guide/features/skills/)** — 再利用できる手順と知識
- **[コツとベストプラクティス](/hermes/docs/guides/tips/)** — 使い込んだ人向けのコツ
- **[別の端末へ移す](/hermes/docs/reference/faq/#exporting-hermes-to-another-machine)** — `hermes backup` で環境まるごと（あるいは[プロファイル1つだけ](/hermes/docs/reference/faq/#moving-a-single-profile-to-another-machine)）移行できます。一から組み直す必要はありません
