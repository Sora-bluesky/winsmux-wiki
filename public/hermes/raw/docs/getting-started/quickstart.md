---
title: "Hermes Agent クイックスタート"
description: "Hermes Agent との最初の会話 — インストールからチャットまで5分以内で"
upstream_path: getting-started/quickstart.md
upstream_blob: 168609a006d21411ecef9f0a8baca02cb7d9101b
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
---

# Hermes Agent クイックスタート {#hermes-agent-quickstart}

このガイドでは、何もない状態から、実際の利用に耐える Hermes の環境を作り上げます。インストールし、プロバイダーを選び、チャットが動くことを確認し、そして何かが壊れたときに何をすればよいかまで、はっきりと分かる形で進めます。

## 動画で見たい方へ {#prefer-to-watch}

**Onchain AI Garage** が、インストール・セットアップ・基本コマンドを解説する Masterclass 形式の動画を用意しています。動画に沿って進めたい方には、このページと併せて見るのがおすすめです。さらに詳しく知りたい場合は、[Hermes Agent Tutorials & Use Cases](https://www.youtube.com/playlist?list=PLmpUb_PWAkDxewld5ZYyKifuHxgIbiq2d) のプレイリスト全体をご覧ください。

[YouTube: https://www.youtube-nocookie.com/embed/R3YOGfTBcQg](https://www.youtube-nocookie.com/embed/R3YOGfTBcQg)

## こんな方に向いています {#who-this-is-for}

- まったくの初めてで、動く環境までの最短ルートを知りたい
- プロバイダーを乗り換えるところで、設定ミスに時間を取られたくない
- チーム利用・ボット・常時稼働のワークフローとして Hermes を用意したい
- 「インストールはできたのに、何も起きない」状態にうんざりしている

## いちばん速い進め方 {#the-fastest-path}

自分の目的に当てはまる行を選んでください。

| 目的 | まずこれを実行する | 次にこれを行う |
|---|---|---|
| とにかく手元のマシンで Hermes を動かしたい | `hermes setup` | 実際にチャットして、応答が返ることを確かめる |
| 使うプロバイダーはもう決まっている | `hermes model` | 設定を保存して、チャットを開始する |
| ボットや常時稼働の構成にしたい | CLI が動いてから `hermes gateway setup` | Telegram・Discord・Slack などのプラットフォームに接続する |
| ローカルまたは自前ホストのモデルを使いたい | `hermes model` → カスタムエンドポイント | エンドポイント・モデル名・コンテキスト長を確認する |
| 複数プロバイダーのフォールバックを使いたい | まず `hermes model` | 基本のチャットが動いてから、ルーティングとフォールバックを追加する |

**目安:** Hermes が普通のチャットを完了できないうちは、機能を足さないでください。まずはきれいに会話が1往復以上できる状態を作り、それからゲートウェイ・cron・スキル・音声・ルーティングを重ねていきます。

---

## 1. Hermes Agent をインストールする {#1-install-hermes-agent}
### macOS / Windows で Hermes Desktop インストーラーを使う（推奨） {#with-the-hermes-desktop-installer-on-macos-or-windows-recommended}
コマンドラインアプリとデスクトップアプリをまとめて手軽に入れるには、公式サイトから [Hermes Desktop インストーラーをダウンロード](https://hermes-agent.nousresearch.com/)して実行してください。

### Hermes Desktop を使わない場合: {#without-hermes-desktop}
Hermes Desktop なしで、コマンドラインのみをインストールする場合は次を実行します。

#### Linux / macOS / WSL2 / Android (Termux) {#linux-macos-wsl2-android-termux}
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

#### Windows（ネイティブ） {#windows-native}

PowerShell で次を実行します。
```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1) 
```

:::tip Android / Termux
スマートフォンにインストールする場合は、専用の [Termux ガイド](/hermes/docs/getting-started/termux/)をご覧ください。動作確認済みの手動手順、対応している追加機能、そして現時点での Android 固有の制限がまとまっています。
:::

インストールが終わったら、シェルを読み込み直します。

```bash
source ~/.bashrc   # or source ~/.zshrc
```

インストールの細かな選択肢、事前に必要なもの、うまくいかないときの対処は [インストールガイド](/hermes/docs/getting-started/installation/)にまとめてあります。

## 2. プロバイダーを選ぶ {#2-choose-a-provider}

セットアップのなかで、いちばん重要な工程です。`hermes model` を実行すると、対話形式で選んでいけます。

```bash
hermes model
```

:::tip いちばん簡単なのは Nous Portal
1つのサブスクリプションで 300 以上のモデルに加えて、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)（ウェブ検索・画像生成・TTS・クラウドブラウザ）も使えるようになります。インストール直後の状態なら次のコマンドです。

```bash
hermes setup --portal
```

このコマンド1つで、ログインし、プロバイダーを Nous に設定し、Tool Gateway を有効にするところまで済みます。
:::

:::info セットアップのモード
インストール直後に `hermes setup` を実行すると、3つのモードから選べます。

- **Quick Setup (Nous Portal)** — 無料の OAuth ログインで、API キーは不要です。モデルと Tool Gateway のツール群をまとめて設定します。おすすめの最短ルートです。
- **Full Setup** — すべてのプロバイダー・ツール・オプションを自分で見ながら設定します（キーは自分で用意します）。
- **Blank Slate** — エージェントを動かすのに最低限必要なもの、つまり**プロバイダーとモデル、File Operations ツールセット、Terminal ツールセット**を除いて、すべてが**オフ**の状態から始まります。ウェブ、ブラウザ、コード実行、画像認識、メモリ、委任、cron、スキル、プラグイン、MCP サーバーはいずれも入らず、圧縮・チェックポイント・スマートルーティング・メモリ取得もすべて無効です。この最小構成が適用されたあと、2つの進み方から選びます。**すべて無効のまま始める**（最小構成のエージェントでここで終える）か、**すべての設定項目を順に見ていく**（ツール・スキル・プラグイン・MCP・メッセージングを必要な分だけ有効にする）かです。最小限で完全に自分の管理下にあるエージェントを作り、本当に必要なものだけを有効にしたいときは、これを選んでください。

Blank Slate は `platform_toolsets.cli` のリストと `agent.disabled_toolsets` を明示的に書き出すため、自分が選んでいないものは決して読み込まれません。`hermes update` のあとでも同じです。あとから有効にしたくなったら `hermes tools`、スキルを入れたければ `hermes skills opt-in --sync`、設定を調整したければ `hermes setup agent` を使います。
:::

無難な選択肢は次のとおりです。

| プロバイダー | どういうものか | 設定方法 |
|----------|-----------|---------------|
| **Nous Portal** | サブスクリプション型で、設定不要 | `hermes model` から OAuth ログイン |
| **OpenAI Codex** | ChatGPT または Codex のサブスクリプションで、Codex 系モデルを使う | `hermes model` → **ChatGPT or Codex Subscription** でデバイスコード認証 |
| **Anthropic** | Claude のモデルを直接利用。Max プラン＋追加の利用クレジット（OAuth）か、従量課金の API キー | `hermes model` → OAuth ログイン（Max ＋追加クレジットが必要）、または Anthropic の API キー |
| **OpenRouter** | 多数のモデルを横断する、複数プロバイダーのルーティング | API キーを入力する |
| **Fireworks AI** | OpenAI 互換のモデル API に直接接続 | `FIREWORKS_API_KEY` を設定 |
| **Z.AI** | GLM / 智譜（Zhipu）がホストするモデル | `GLM_API_KEY` / `ZAI_API_KEY` を設定（`Z_AI_API_KEY` も使えます） |
| **Kimi / Moonshot** | Moonshot がホストするコーディング／チャット向けモデル | `KIMI_API_KEY` を設定（Kimi Coding 専用の `KIMI_CODING_API_KEY` も可） |
| **Kimi / Moonshot China** | 中国リージョンの Moonshot エンドポイント | `KIMI_CN_API_KEY` を設定 |
| **Arcee AI** | Trinity 系モデル | `ARCEEAI_API_KEY` を設定 |
| **GMI Cloud** | 複数モデルに直接つながる API | `GMI_API_KEY` を設定 |
| **Actual Computer** | 自分のハードウェアをプライベートな推論クラスタとして使う。ホスト型リレーまたはローカルのデーモン | `ACTUAL_API_KEY`（リレー）または `ACTUAL_BASE_URL=http://127.0.0.1:8080`（ローカル、キー不要）を設定 |
| **MiniMax (OAuth)** | ブラウザ OAuth 経由で MiniMax の最上位モデルを利用。API キーは不要（`hermes_cli/models.py` に書かれたモデル名はリリースごとに変わることがあります） | `hermes model` → MiniMax (OAuth) |
| **MiniMax** | 国際版の MiniMax エンドポイント | `MINIMAX_API_KEY` を設定 |
| **MiniMax China** | 中国リージョンの MiniMax エンドポイント | `MINIMAX_CN_API_KEY` を設定 |
| **Alibaba Cloud** | DashScope 経由の Qwen 系モデル | `DASHSCOPE_API_KEY` を設定（Qwen Coding Plan では `ALIBABA_CODING_PLAN_API_KEY` も使えます） |
| **Hugging Face** | 統合ルーター経由で 20 以上のオープンモデル（Qwen・DeepSeek・Kimi など） | `HF_TOKEN` を設定 |
| **AWS Bedrock** | ネイティブの Converse API 経由で Claude・Nova・Llama・DeepSeek を利用 | IAM ロールまたは `aws configure`（[ガイド](/hermes/docs/guides/aws-bedrock/)） |
| **Azure Foundry** | Azure AI Foundry でホストされているモデル | `AZURE_FOUNDRY_API_KEY` と `AZURE_FOUNDRY_BASE_URL` を設定 |
| **Google AI Studio** | API に直接つないで Gemini 系モデルを利用 | `GOOGLE_API_KEY` / `GEMINI_API_KEY` を設定 |
| **xAI** | API に直接つないで Grok 系モデルを利用 | `XAI_API_KEY` を設定 |
| **xAI Grok OAuth** | SuperGrok / Premium+ のサブスクリプションを利用。API キーは不要 | `hermes model` → xAI Grok OAuth |
| **NovitaAI** | 複数モデルに対応した API ゲートウェイ | `NOVITA_API_KEY` を設定 |
| **StepFun** | Step Plan のモデル | `STEPFUN_API_KEY` を設定 |
| **Xiaomi MiMo** | Xiaomi がホストするモデル | `XIAOMI_API_KEY` を設定 |
| **Tencent TokenHub** | Tencent がホストするモデル | `TOKENHUB_API_KEY` を設定 |
| **Ollama Cloud** | マネージド型でホストされる Ollama のモデル | `OLLAMA_API_KEY` を設定 |
| **LM Studio** | OpenAI 互換 API を公開するローカルのデスクトップアプリ | `LM_API_KEY` を設定（既定以外なら `LM_BASE_URL` も） |
| **Qwen OAuth** | Qwen Portal のブラウザ OAuth。API キーは不要 | `hermes model` → Qwen OAuth |
| **Kilo Code** | KiloCode がホストするモデル | `KILOCODE_API_KEY` を設定 |
| **OpenCode Zen** | 厳選されたモデルを従量課金で利用 | `OPENCODE_ZEN_API_KEY` を設定 |
| **OpenCode Go** | オープンモデル向けの月額 10 ドルのサブスクリプション | `OPENCODE_GO_API_KEY` を設定 |
| **DeepSeek** | DeepSeek の API に直接アクセス | `DEEPSEEK_API_KEY` を設定 |
| **NVIDIA NIM** | build.nvidia.com またはローカルの NIM 経由で Nemotron 系モデルを利用 | `NVIDIA_API_KEY` を設定（任意で `NVIDIA_BASE_URL`） |
| **GitHub Copilot** | GitHub Copilot のサブスクリプション（GPT-5.x・Claude・Gemini など） | `hermes model` から OAuth、または `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` |
| **GitHub Copilot ACP** | Copilot の ACP エージェントをバックエンドにする（ローカルの `copilot` CLI を起動します） | `hermes model`（`copilot` CLI と `copilot login` が必要） |
| **Vercel AI Gateway** | Vercel AI Gateway によるルーティング | `AI_GATEWAY_API_KEY` を設定 |
| **Custom Endpoint** | VLLM・SGLang・Ollama など、OpenAI 互換の API すべて | ベース URL と API キーを設定 |

はじめて使う方の多くは、プロバイダーを選んだら、変える理由がはっきりしない限り既定値のままで構いません。環境変数と設定手順を含むプロバイダーの一覧は [Providers](/hermes/docs/integrations/providers/) のページにあります。

:::caution 必要なコンテキスト長は 64K トークン以上
Hermes Agent は、コンテキストが少なくとも **64,000 トークン**あるモデルを必要とします。これより小さいモデルでは、複数手順のツール呼び出しを進めるだけの作業記憶を保てないため、起動時に受け付けられません。ホスト型のモデル（Claude・GPT・Gemini・Qwen・DeepSeek など）はたいてい余裕で満たします。ローカルのモデルを動かす場合は、コンテキストサイズを 64K 以上に設定してください（llama.cpp なら `--ctx-size 65536`、Ollama なら `-c 65536` など）。
:::

:::tip
プロバイダーは `hermes model` でいつでも切り替えられます。特定の1社に縛られることはありません。対応プロバイダーの全一覧と設定の詳細は [AI Providers](/hermes/docs/integrations/providers/) をご覧ください。
:::

### 設定の保存先 {#how-settings-are-stored}

Hermes は、秘密情報と通常の設定を分けて保存します。

- **秘密情報とトークン** → `~/.hermes/.env`
- **秘密でない設定** → `~/.hermes/config.yaml`

正しい場所に値を入れるいちばん簡単な方法は、CLI を使うことです。

```bash
hermes config set model anthropic/claude-opus-4.6
hermes config set terminal.backend docker
hermes config set OPENROUTER_API_KEY sk-or-...
```

適切な値が、自動的に適切なファイルへ書き込まれます。

## 3. 最初のチャットを実行する {#3-run-your-first-chat}

```bash
hermes            # classic CLI
hermes --tui      # modern TUI (recommended)
```

起動すると、使っているモデル・利用できるツール・スキルが並んだウェルカムバナーが表示されます。最初のプロンプトには、具体的で結果を確かめやすいものを選びましょう。

:::tip インターフェースを選ぶ
Hermes には2種類のターミナルインターフェースが付属します。従来からある `prompt_toolkit` ベースの CLI と、モーダルオーバーレイ・マウス選択・入力をブロックしない操作に対応した新しい [TUI](/hermes/docs/user-guide/tui/) です。どちらもセッション・スラッシュコマンド・設定を共有しているので、`hermes` と `hermes --tui` を両方試してみてください。
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

- バナーに、自分が選んだモデル／プロバイダーが表示されている
- Hermes がエラーを出さずに返答する
- 必要に応じてツール（ターミナル、ファイル読み取り、ウェブ検索）を使える
- 1往復で終わらず、会話がそのまま続けられる

ここまで動いていれば、いちばん難しいところは越えています。

## 4. セッションが動くことを確認する {#4-verify-sessions-work}

次に進む前に、会話の再開が効くことを確かめておきます。

```bash
hermes --continue    # Resume the most recent session
hermes -c            # Short form
```

これで、直前の会話に戻れるはずです。戻れない場合は、同じプロファイルにいるかどうか、そしてセッションが実際に保存されているかどうかを確認してください。ここは、あとで複数の構成や端末を使い分けるようになったときに効いてきます。

## 5. 主な機能を試す {#5-try-key-features}

### ターミナルを使う {#use-the-terminal}

```
❯ What's my disk usage? Show the top 5 largest directories.
```

エージェントが代わりにターミナルのコマンドを実行し、結果を見せてくれます。

### スラッシュコマンド {#slash-commands}

`/` と入力すると、すべてのコマンドが補完候補として一覧表示されます。

| コマンド | できること |
|---------|-------------|
| `/help` | 利用できるコマンドをすべて表示する |
| `/tools` | 利用できるツールを一覧表示する |
| `/model` | 対話形式でモデルを切り替える |
| `/personality pirate` | 遊び心のある人格を試す |
| `/save` | 会話を保存する |

### 複数行の入力 {#multi-line-input}

`Alt+Enter`、`Ctrl+J`、`Shift+Enter` のいずれかで改行を挿入できます。`Shift+Enter` は、それを独立したシーケンスとして送信できるターミナルが必要です（Kitty / foot / WezTerm / Ghostty は既定で対応。iTerm2 / Alacritty / VS Code のターミナルは、Kitty キーボードプロトコルを有効にすれば使えます）。`Alt+Enter` と `Ctrl+J` は、どのターミナルでも動作します。

### エージェントを中断する {#interrupt-the-agent}

エージェントの処理が長引いていると感じたら、新しいメッセージを入力して Enter を押してください。実行中のタスクを中断して、新しい指示に切り替わります。`Ctrl+C` でも中断できます。

## 6. 次の層を足す {#6-add-the-next-layer}

基本のチャットが動いてから進んでください。必要なものだけ選びます。

### ボットや共有アシスタント {#bot-or-shared-assistant}

```bash
hermes gateway setup    # Interactive platform configuration
```

[Telegram](/hermes/docs/user-guide/messaging/telegram/)、[Discord](/hermes/docs/user-guide/messaging/discord/)、[Slack](/hermes/docs/user-guide/messaging/slack/)、[WhatsApp](/hermes/docs/user-guide/messaging/whatsapp/)、[Signal](/hermes/docs/user-guide/messaging/signal/)、[Email](/hermes/docs/user-guide/messaging/email/)、[Home Assistant](/hermes/docs/user-guide/messaging/homeassistant/)、または [Microsoft Teams](/hermes/docs/user-guide/messaging/teams/) に接続できます。

### 自動化とツール {#automation-and-tools}

- `hermes tools` — プラットフォームごとにツールの利用範囲を調整する
- `hermes skills` — 再利用できるワークフローを探して導入する
- Cron — ボットや CLI の構成が安定してから使う

### サンドボックス化したターミナル {#sandboxed-terminal}

安全のために、エージェントを Docker コンテナやリモートサーバー上で動かせます。

```bash
hermes config set terminal.backend docker    # Docker isolation
hermes config set terminal.backend ssh       # Remote server
```

Docker サンドボックスでは、**送信時に資格情報を注入するプロキシ**も有効にできます。これを使うと、サンドボックスからは本物の API キーが一切見えなくなり、ローカルの TLS 傍受デーモンの後ろでしか通用しない不透明なプロキシトークンだけが渡ります。詳しくは [Egress proxy](/hermes/docs/user-guide/egress/iron-proxy/) をご覧ください。設定は `hermes egress setup && hermes egress start` で、`hermes setup terminal` でも Docker 利用者にはこの機能が案内されます。Modal・SSH・Daytona・Singularity はまだ対応していません。

### 音声モード {#voice-mode}

```bash
# From the Hermes install directory (the curl installer placed it at
# ~/.hermes/hermes-agent on Linux/macOS or %LOCALAPPDATA%\hermes\hermes-agent on Windows):
cd ~/.hermes/hermes-agent
uv pip install --python ./venv/bin/python -e ".[voice]"
# Includes faster-whisper for free local speech-to-text
```

そのうえで、CLI で `/voice on` と入力します。録音は `Ctrl+B` です。詳しくは [Voice Mode](/hermes/docs/user-guide/features/voice-mode/) をご覧ください。

### スキル {#skills}

スキルとは、特定の作業のやり方を Hermes に教える、必要なときだけ読み込まれる手順書です。Kubernetes へのデプロイ、GitHub の PR 作成、モデルのファインチューニング、GIF の検索といった具合です。実体は、名前・説明・手順を書いた `SKILL.md` ファイルです。エージェントは短い説明だけを常に把握しておき、実際にその作業が必要になったときに初めて中身を読み込むので、スキルを増やしても毎回のリクエストが重くなることはありません。

Hermes には、あらかじめ用意されたスキルのカタログが `~/.hermes/skills/` に導入済みの状態で付属しています。Skills Hub からさらに追加することも、自分で書くこともできます。

**ハブから探して導入する:**

```bash
hermes skills browse                      # list everything available
hermes skills search kubernetes           # find skills by keyword
hermes skills install openai/skills/k8s   # install one (runs a security scan first)
```

導入時に指定する引数は、ハブ上の `source/path` 形式の識別子です。`openai/skills/k8s` なら、OpenAI のカタログにある `k8s` スキルを指します。使うべき正確な識別子は `hermes skills browse` で確認できます。

**スキルを使う** — 導入したスキルは、自動的にスラッシュコマンドになります。

```bash
/k8s deploy the staging manifest          # run the skill with a request
/k8s                                       # load it and let Hermes ask what you need
```

これは CLI でも、接続したメッセージングプラットフォームでも同じように動きます。最初から全部を導入しておく必要はありません。普通に会話しているなかで作業内容が合致すれば、エージェントが付属スキルの中から適切なものを自分で選びます。

自分でスキルを書く方法、外部のスキルディレクトリ、ハブの取得元一覧については [Skills System](/hermes/docs/user-guide/features/skills/) をご覧ください。

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

ACP のサポートは標準の `[all]` エクストラに含まれているので、curl 版インストーラーを使っていればすでに入っています。次を実行するだけです。

```bash
hermes acp
```

（`[all]` なしでインストールした場合は、先に `cd ~/.hermes/hermes-agent && uv pip install -e ".[acp]"` を実行してください。）

詳しくは [ACP Editor Integration](/hermes/docs/user-guide/features/acp/) をご覧ください。

---

## よくあるつまずき方 {#common-failure-modes}

いちばん時間を奪われがちな問題は、次のとおりです。

| 症状 | 考えられる原因 | 対処 |
|---|---|---|
| Hermes は起動するが、返答が空になる、または壊れている | プロバイダーの認証かモデルの選択が正しくない | `hermes model` をもう一度実行し、プロバイダー・モデル・認証を確認する |
| カスタムエンドポイントは「動いている」のに、意味不明な出力が返る | ベース URL かモデル名が違う、あるいは実際には OpenAI 互換でない | まず別のクライアントでそのエンドポイントを検証する |
| ゲートウェイは起動するが、誰もメッセージを送れない | ボットのトークン、許可リスト、プラットフォーム側の設定が不完全 | `hermes gateway setup` をやり直し、`hermes gateway status` を確認する |
| `hermes --continue` が以前のセッションを見つけられない | プロファイルを切り替えた、またはセッションが保存されていない | `hermes sessions list` を確認し、正しいプロファイルにいるか確かめる |
| モデルが使えない、フォールバックの挙動がおかしい | プロバイダーのルーティングやフォールバックの設定が強すぎる | 基本のプロバイダーが安定するまでルーティングはオフのままにする |
| `hermes doctor` が設定の問題を指摘する | 設定値が欠けている、または古い | 設定を直し、機能を足す前に素のチャットで再確認する |

## 復旧のための手順 {#recovery-toolkit}

どうも様子がおかしいと感じたら、この順番で試してください。

1. `hermes doctor`
2. `hermes model`
3. `hermes setup`
4. `hermes sessions list`
5. `hermes --continue`
6. `hermes gateway status`

この流れをたどれば、「なんだか壊れている」状態から、把握できている状態まで素早く戻れます。

---

## 早見表 {#quick-reference}

| コマンド | 説明 |
|---------|-------------|
| `hermes` | チャットを開始する |
| `hermes model` | LLM のプロバイダーとモデルを選ぶ |
| `hermes tools` | プラットフォームごとに有効なツールを設定する |
| `hermes setup` | フルセットアップウィザード（すべてをまとめて設定する） |
| `hermes doctor` | 問題を診断する |
| `hermes update` | 最新バージョンに更新する |
| `hermes gateway` | メッセージングゲートウェイを起動する |
| `hermes --continue` | 直前のセッションを再開する |

## 次のステップ {#next-steps}

- **[CLI Guide](/hermes/docs/user-guide/cli/)** — ターミナルインターフェースを使いこなす
- **[Configuration](/hermes/docs/user-guide/configuration/)** — 自分好みに設定を調整する
- **[Messaging Gateway](/hermes/docs/user-guide/messaging/)** — Telegram・Discord・Slack・WhatsApp・Signal・Email・Home Assistant・Teams などに接続する
- **[Tools & Toolsets](/hermes/docs/user-guide/features/tools/)** — 利用できる機能を見てまわる
- **[AI Providers](/hermes/docs/integrations/providers/)** — プロバイダーの全一覧と設定の詳細
- **[Skills System](/hermes/docs/user-guide/features/skills/)** — 再利用できるワークフローと知識
- **[Tips & Best Practices](/hermes/docs/guides/tips/)** — 使い込んだ人向けのコツ
- **[Moving to another machine](/hermes/docs/reference/faq/#exporting-hermes-to-another-machine)** — `hermes backup` で環境をまるごと移行できます（[プロファイル1つだけ](/hermes/docs/reference/faq/#moving-a-single-profile-to-another-machine)の移行も可能）。一から作り直す必要はありません
