---
title: "Hermes Agent クイックスタート"
description: "Hermes Agent との最初の会話まで。インストールからおしゃべりできるまで 5 分"
upstream_path: getting-started/quickstart.md
upstream_blob: 364a6a9868eb5742193e014b9363d034320cd36f
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
---

# Hermes Agent クイックスタート {#hermes-agent-quickstart}

この案内では、何も無い状態から、実際に使い続けられる Hermes の環境までを作ります。インストールし、プロバイダーを選び、会話がちゃんと動くことを確かめ、うまくいかないときに何をすればよいかまで分かる形にします。

## 動画で見たい方へ {#prefer-to-watch}

**Onchain AI Garage** が、インストール・初期設定・基本のコマンドをひととおり見せるマスタークラス動画を作っています。文章を追うより動画で一緒に手を動かしたい方には、このページのよい相棒になります。もっと見たい場合は [Hermes Agent Tutorials & Use Cases](https://www.youtube.com/playlist?list=PLmpUb_PWAkDxewld5ZYyKifuHxgIbiq2d) の再生リストをどうぞ。

[YouTube: https://www.youtube-nocookie.com/embed/R3YOGfTBcQg](https://www.youtube-nocookie.com/embed/R3YOGfTBcQg)

## こんな方に向いています {#who-this-is-for}

- まったくの初めてで、動く状態までの最短の道を知りたい
- プロバイダーを乗り換えるところで、設定の間違いに時間を取られたくない
- チームやボット、動かしっぱなしの仕組みのために Hermes を用意したい
- 「入ったけれど何も起きない」に疲れている

## いちばん速い道 {#the-fastest-path}

自分の目的に合う行を選んでください。

| 目的 | まずこれ | 次にこれ |
|---|---|---|
| とにかく自分の端末で Hermes を動かしたい | `hermes setup` | 実際に会話して、返事が来ることを確かめる |
| 使うプロバイダーはもう決まっている | `hermes model` | 設定を保存して、会話を始める |
| ボットや動かしっぱなしの構成にしたい | CLI が動いてから `hermes gateway setup` | Telegram、Discord、Slack などにつなぐ |
| 手元のモデルや自前で立てたモデルを使いたい | `hermes model` から独自の接続先へ | 接続先、モデル名、扱える文脈の長さを確かめる |
| プロバイダーを複数用意して切り替えたい | まず `hermes model` | 基本の会話が動いてから、振り分けと切り替えを足す |

**目安:** Hermes が普通の会話をこなせないうちは、機能を足さないでください。まずきれいな会話を 1 本通してから、ゲートウェイ、定期実行、スキル、音声、振り分けを重ねていきます。

---

## 1. Hermes Agent を入れる {#1-install-hermes-agent}
### macOS か Windows で Hermes Desktop のインストーラーを使う（おすすめ） {#with-the-hermes-desktop-installer-on-macos-or-windows-recommended}
コマンドラインとデスクトップの両方を手軽に入れるには、公式サイトから [Hermes Desktop のインストーラーを入手](https://hermes-agent.nousresearch.com/) して実行してください。

### Hermes Desktop を使わない場合: {#without-hermes-desktop}
Hermes Desktop なしでコマンドラインだけを入れるには、次を実行します。

#### Linux / macOS / WSL2 / Android（Termux） {#linux-macos-wsl2-android-termux}
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

#### Windows（そのまま） {#windows-native}

powershell で実行します。
```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1) 
```

:::tip Android / Termux
スマートフォンに入れる場合は、動作を確かめた手作業の手順、使える追加機能、今のところの Android 固有の制限をまとめた [Termux の案内](/hermes/docs/getting-started/termux/) を参照してください。
:::

終わったら、シェルを読み込み直します。

```bash
source ~/.bashrc   # or source ~/.zshrc
```

インストールの細かい選択肢、必要なもの、うまくいかないときの対処は [インストールの案内](/hermes/docs/getting-started/installation/) にあります。

## 2. プロバイダーを選ぶ {#2-choose-a-provider}

ここが最初の設定でいちばん大事なところです。`hermes model` を使うと、対話しながら選べます。

```bash
hermes model
```

:::tip いちばん簡単な道: Nous Portal
1 つの購読で 300 を超えるモデルに加えて、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)（Web 検索、画像生成、読み上げ、クラウド上のブラウザー）も使えます。入れたばかりの状態なら、次のとおりです。

```bash
hermes setup --portal
```

これ 1 つで、ログインし、Nous をプロバイダーに設定し、Tool Gateway を有効にします。
:::

:::info 初期設定の 3 つのやり方
入れたばかりの状態で `hermes setup` を実行すると、3 つのやり方から選べます。

- **Quick Setup（Nous Portal）** — OAuth でログインするだけで、API キーの管理は不要です。モデルと Tool Gateway のツールがまとめて用意され、料金は [Nous Portal の購読](/hermes/docs/integrations/nous-portal/) に付きます。おすすめの近道です。
- **Full Setup** — プロバイダー、ツール、選択肢を自分で一つずつ見ていきます（キーは自分で用意します）。
- **Blank Slate** — エージェントを動かすのに最低限必要なもの以外は、すべて **オフ** から始まります。残るのは **プロバイダーとモデル、ファイル操作のツール群、端末のツール群** だけです。Web、ブラウザー、コード実行、画像認識、記憶、委任、定期実行、スキル、プラグイン、MCP サーバーはどれも入らず、圧縮、チェックポイント、賢い振り分け、記憶の取り込みもすべて無効です。この最小の土台を当てたあと、2 つの道のどちらかを選びます。**すべて無効のまま始める**（最小構成のまま終える）か、**すべての設定を見ていく**（ツール、スキル、プラグイン、MCP、メッセージ連携を自分で選んで有効にする）かです。最小限で完全に制御できるエージェントがほしく、必要なものだけを自分で有効にするつもりのときはこれを選んでください。

Blank Slate は `platform_toolsets.cli` の一覧と `agent.disabled_toolsets` を明示的に書き込むので、選んでいないものが読み込まれることはありません。`hermes update` のあとでも同じです。あとから有効にしたくなったら `hermes tools`、スキルを入れたくなったら `hermes skills opt-in --sync`、細かい設定を変えたくなったら `hermes setup agent` を使います。
:::

無難な選び方は次のとおりです。

| プロバイダー | どんなものか | 設定のしかた |
|----------|-----------|---------------|
| **Nous Portal** | 購読型で、設定がほぼ要らない | `hermes model` から OAuth でログイン |
| **OpenAI Codex** | ChatGPT か Codex の購読で、Codex のモデルを使う | `hermes model` → **ChatGPT or Codex Subscription** からデバイスコードで認証 |
| **Anthropic** | Claude のモデルを直接使う。Max プラン + 追加の利用クレジット（OAuth）か、従量課金の API キー | `hermes model` → OAuth でログイン（Max + 追加クレジットが必要）、または Anthropic の API キー |
| **OpenRouter** | 多くのモデルにまたがってプロバイダーを振り分ける | 自分の API キーを入力 |
| **Fireworks AI** | OpenAI 互換のモデル API を直接使う | `FIREWORKS_API_KEY` を設定 |
| **Z.AI** | GLM / Zhipu が提供するモデル | `GLM_API_KEY` / `ZAI_API_KEY` を設定（`Z_AI_API_KEY` も使えます） |
| **Kimi / Moonshot** | Moonshot が提供するコーディング・会話向けのモデル | `KIMI_API_KEY` を設定（Kimi Coding 専用の `KIMI_CODING_API_KEY` も可） |
| **Kimi / Moonshot China** | 中国地域向けの Moonshot の接続先 | `KIMI_CN_API_KEY` を設定 |
| **Arcee AI** | Trinity のモデル | `ARCEEAI_API_KEY` を設定 |
| **GMI Cloud** | 複数モデルを直接使える API | `GMI_API_KEY` を設定 |
| **Actual Computer** | 自分の機材を専用の推論クラスターにする。中継サーバー経由か、手元の常駐プロセスか | `ACTUAL_API_KEY`（中継）または `ACTUAL_BASE_URL=http://127.0.0.1:8080`（手元。キー不要）を設定 |
| **MiniMax（OAuth）** | ブラウザーの OAuth で MiniMax の最新モデルを使う。API キーは不要（`hermes_cli/models.py` のモデル名は版によって変わることがあります） | `hermes model` → MiniMax (OAuth) |
| **MiniMax** | 国際版の MiniMax の接続先 | `MINIMAX_API_KEY` を設定 |
| **MiniMax China** | 中国地域向けの MiniMax の接続先 | `MINIMAX_CN_API_KEY` を設定 |
| **Alibaba Cloud** | DashScope 経由の Qwen のモデル | `DASHSCOPE_API_KEY` を設定（Qwen Coding Plan は `ALIBABA_CODING_PLAN_API_KEY` も使えます） |
| **Hugging Face** | 共通の中継で 20 以上のオープンなモデル（Qwen、DeepSeek、Kimi など） | `HF_TOKEN` を設定 |
| **AWS Bedrock** | Converse API で Claude、Nova、Llama、DeepSeek を使う | IAM ロールか `aws configure`（[案内](/hermes/docs/guides/aws-bedrock/)） |
| **Azure Foundry** | Azure AI Foundry が提供するモデル | `AZURE_FOUNDRY_API_KEY` と `AZURE_FOUNDRY_BASE_URL` を設定 |
| **Google AI Studio** | 直接の API で Gemini のモデルを使う | `GOOGLE_API_KEY` / `GEMINI_API_KEY` を設定 |
| **xAI** | 直接の API で Grok のモデルを使う | `XAI_API_KEY` を設定 |
| **xAI Grok OAuth** | SuperGrok / Premium+ の購読で使う。API キーは不要 | `hermes model` → xAI Grok OAuth |
| **NovitaAI** | 複数モデルをまとめた API ゲートウェイ | `NOVITA_API_KEY` を設定 |
| **Ramp Router** | Responses 形式に対応し、OpenAI / Anthropic / xAI などへ振り分けるゲートウェイ | `RAMP_ROUTER_API_KEY` を設定 |
| **Nebius Token Factory** | Nebius AI クラウド上のオープンなモデル | `NEBIUS_API_KEY` を設定 |
| **StepFun** | Step Plan のモデル | `STEPFUN_API_KEY` を設定 |
| **Xiaomi MiMo** | Xiaomi が提供するモデル | `XIAOMI_API_KEY` を設定 |
| **Tencent TokenHub** | Tencent が提供するモデル | `TOKENHUB_API_KEY` を設定 |
| **Tencent TokenPlan** | Anthropic 形式の接続先で使う Tencent の Hy のモデル | `TOKENPLAN_API_KEY` を設定 |
| **Ollama Cloud** | 運用込みで提供される Ollama のモデル | `OLLAMA_API_KEY` を設定 |
| **LM Studio** | OpenAI 互換の API を出す手元のデスクトップアプリ | `LM_API_KEY` を設定（既定以外なら `LM_BASE_URL` も） |
| **Qwen OAuth** | Qwen Portal のブラウザー OAuth。API キーは不要 | `hermes model` → Qwen OAuth |
| **Kilo Code** | KiloCode が提供するモデル | `KILOCODE_API_KEY` を設定 |
| **OpenCode Zen** | 選び抜かれたモデルを従量課金で使う | `OPENCODE_ZEN_API_KEY` を設定 |
| **OpenCode Go** | オープンなモデルを月 10 ドルの購読で使う | `OPENCODE_GO_API_KEY` を設定 |
| **DeepSeek** | DeepSeek の API を直接使う | `DEEPSEEK_API_KEY` を設定 |
| **NVIDIA NIM** | build.nvidia.com か手元の NIM で Nemotron のモデルを使う | `NVIDIA_API_KEY` を設定（任意で `NVIDIA_BASE_URL`） |
| **GitHub Copilot** | GitHub Copilot の購読（GPT-5.x、Claude、Gemini など） | `hermes model` から OAuth、または `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` |
| **GitHub Copilot ACP** | Copilot の ACP エージェントを裏側に使う（手元の `copilot` CLI を起動します） | `hermes model`（`copilot` CLI と `copilot login` が必要） |
| **Vercel AI Gateway** | Vercel AI Gateway による振り分け | `AI_GATEWAY_API_KEY` を設定 |
| **Custom Endpoint** | VLLM、SGLang、Ollama など OpenAI 互換の API なら何でも | ベース URL と API キーを設定 |

初めての方のほとんどは、プロバイダーを選んだら、変える理由がはっきりしない限り既定のままで大丈夫です。環境変数と設定手順を載せたプロバイダーの全一覧は [プロバイダー](/hermes/docs/integrations/providers/) のページにあります。

:::caution 必要な文脈の広さ: 64K トークン
Hermes Agent には、少なくとも **64,000 トークン** の文脈を扱えるモデルが必要です。それより狭いモデルでは、ツールを何段も呼ぶ作業に必要な作業記憶を保てないため、起動時にはじかれます。世の中で提供されているモデル（Claude、GPT、Gemini、Qwen、DeepSeek）のほとんどは余裕で満たします。手元でモデルを動かす場合は、文脈の広さを 64K 以上に設定してください（llama.cpp なら `--ctx-size 65536`、Ollama なら `-c 65536` など）。
:::

:::tip
プロバイダーは `hermes model` でいつでも変えられます。囲い込みはありません。対応しているプロバイダーの全一覧と設定の詳細は [AI プロバイダー](/hermes/docs/integrations/providers/) を参照してください。
:::

### 設定はどこに保存されるのか {#how-settings-are-stored}

Hermes は、秘密の情報と普通の設定を分けて保存します。

- **秘密の情報とトークン** → `~/.hermes/.env`
- **秘密ではない設定** → `~/.hermes/config.yaml`

正しい場所に値を書くいちばん簡単な方法は、CLI を使うことです。

```bash
hermes config set model anthropic/claude-opus-4.6
hermes config set terminal.backend docker
hermes config set OPENROUTER_API_KEY sk-or-...
```

それぞれの値が、自動で正しいファイルへ振り分けられます。

## 3. 最初の会話をする {#3-run-your-first-chat}

```bash
hermes            # classic CLI
hermes --tui      # modern TUI (recommended)
```

使っているモデル、使えるツール、スキルが並んだ開始画面が出ます。うまくいったかどうかを確かめやすい、具体的な頼み方をしてみてください。

:::tip 画面の選び方
Hermes には端末向けの画面が 2 つあります。昔ながらの `prompt_toolkit` の CLI と、重ねて表示するパネル、マウスでの選択、入力を止めない作りを備えた新しい [TUI](/hermes/docs/user-guide/tui/) です。セッション、スラッシュコマンド、設定はどちらも共通なので、`hermes` と `hermes --tui` の両方を試してみてください。
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

**うまくいっているときの様子:**

- 開始画面に、選んだモデルとプロバイダーが出ている
- Hermes がエラーを出さずに返事をする
- 必要ならツールを使える（端末、ファイルの読み取り、Web 検索）
- 会話が 1 往復で終わらず、そのまま続く

ここまで動けば、いちばん難しいところは越えています。

## 4. セッションが動くか確かめる {#4-verify-sessions-work}

次に進む前に、会話の再開が効くことを確かめてください。

```bash
hermes --continue    # Resume the most recent session
hermes -c            # Short form
```

さっきまでの会話に戻れるはずです。戻れない場合は、同じプロファイルにいるか、会話が実際に保存されているかを確かめてください。ここは、あとで複数の構成や複数の端末を行き来するときに効いてきます。

## 5. 主な機能を試す {#5-try-key-features}

### 端末を使わせる {#use-the-terminal}

```
❯ What's my disk usage? Show the top 5 largest directories.
```

エージェントが代わりに端末のコマンドを実行し、結果を見せてくれます。

### スラッシュコマンド {#slash-commands}

`/` と打つと、コマンドの候補が一覧で出ます。

| コマンド | 何をするか |
|---------|-------------|
| `/help` | 使えるコマンドをすべて表示します |
| `/tools` | 使えるツールを並べます |
| `/model` | 対話しながらモデルを切り替えます |
| `/personality pirate` | 遊びのある人格を試します |
| `/save` | 会話を保存します |

### 複数行の入力 {#multi-line-input}

`Alt+Enter`、`Ctrl+J`、`Shift+Enter` のいずれかで改行できます。`Shift+Enter` は、それを別の入力として送る端末でだけ使えます（既定で使えるのは Kitty / foot / WezTerm / Ghostty。iTerm2 / Alacritty / VS Code の端末は Kitty のキーボードプロトコルを有効にすれば使えます）。`Alt+Enter` と `Ctrl+J` はどの端末でも使えます。

### エージェントを止める {#interrupt-the-agent}

待たされていると感じたら、新しいメッセージを打って Enter を押してください。今の作業を中断して、新しい指示のほうへ切り替わります。`Ctrl+C` でも止まります。

## 6. 次の層を足す {#6-add-the-next-layer}

基本の会話が動いてからにしてください。必要なものだけを選びます。

### ボットや、みんなで使う相談相手 {#bot-or-shared-assistant}

```bash
hermes gateway setup    # Interactive platform configuration
```

[Telegram](/hermes/docs/user-guide/messaging/telegram/)、[Discord](/hermes/docs/user-guide/messaging/discord/)、[Slack](/hermes/docs/user-guide/messaging/slack/)、[WhatsApp](/hermes/docs/user-guide/messaging/whatsapp/)、[Signal](/hermes/docs/user-guide/messaging/signal/)、[メール](/hermes/docs/user-guide/messaging/email/)、[Home Assistant](/hermes/docs/user-guide/messaging/homeassistant/)、[Microsoft Teams](/hermes/docs/user-guide/messaging/teams/) につなげます。

### 自動化とツール {#automation-and-tools}

- `hermes tools` — 入口ごとに、どのツールを使わせるかを調整します
- `hermes skills` — 繰り返し使える手順を探して入れます
- 定期実行 — ボットや CLI の構成が安定してから

### 隔離した端末 {#sandboxed-terminal}

安全のために、エージェントを Docker のコンテナや別のサーバーの上で動かせます。

```bash
hermes config set terminal.backend docker    # Docker isolation
hermes config set terminal.backend ssh       # Remote server
```

Docker で隔離する場合は、**外向き通信に認証情報を差し込む中継**も有効にできます。こうすると、隔離した環境から本物の API キーは見えず、見えるのは手元の TLS を仲介する常駐プロセスの後ろでしか通らない、意味を持たない代替のトークンだけになります。[外向き通信の中継](/hermes/docs/user-guide/egress/iron-proxy/) を参照してください。用意は `hermes egress setup && hermes egress start` で、`hermes setup terminal` でも Docker を使う人にはここが案内されます。Modal、SSH、Daytona、Singularity にはまだ対応していません。

### 音声モード {#voice-mode}

```bash
# From the Hermes install directory (the curl installer placed it at
# ~/.hermes/hermes-agent on Linux/macOS or %LOCALAPPDATA%\hermes\hermes-agent on Windows):
cd ~/.hermes/hermes-agent
uv pip install --python ./venv/bin/python -e ".[voice]"
# Includes faster-whisper for free local speech-to-text
```

そのあと CLI で `/voice on` と打ちます。録音は `Ctrl+B` です。[音声モード](/hermes/docs/user-guide/features/voice-mode/) を参照してください。

### スキル {#skills}

スキルは、必要になったときだけ読み込まれる手順書です。Kubernetes への配備、GitHub の PR の作成、モデルの追加学習、GIF 探しなど、特定の作業のやり方を Hermes に教えます。中身は、名前と説明と手順を書いた `SKILL.md` ファイル 1 つです。エージェントは短い説明だけを常に見ていて、作業が本当にそれを必要としたときにはじめて全文を読み込むので、スキルを増やしても毎回の要求が膨らむことはありません。

Hermes には、あらかじめ選ばれたスキルが `~/.hermes/skills/` に入った状態で届きます。Skills Hub からさらに足すことも、自分で書くこともできます。

**ハブで探して入れる:**

```bash
hermes skills browse                      # list everything available
hermes skills search kubernetes           # find skills by keyword
hermes skills install openai/skills/k8s   # install one (runs a security scan first)
```

install に渡すのは、ハブでの `source/path` という短い名前です。`openai/skills/k8s` は、OpenAI の一覧にある `k8s` というスキルという意味です。正確な名前は `hermes skills browse` で確認できます。

**スキルを使う** — 入れたスキルは、自動でスラッシュコマンドになります。

```bash
/k8s deploy the staging manifest          # run the skill with a request
/k8s                                       # load it and let Hermes ask what you need
```

これは CLI でも、つないだメッセージのサービスでも同じように使えます。最初に全部入れておく必要はありません。普通に会話しているだけでも、作業に合うスキルがあれば、エージェントが同梱のものから自分で選びます。

自分で書く方法、外部のスキル置き場、ハブの提供元の一覧は [スキルの仕組み](/hermes/docs/user-guide/features/skills/) にあります。

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

### エディターとの連携（ACP） {#editor-integration-acp}

ACP への対応は標準の `[all]` の追加分に含まれているので、curl のインストーラーを使っていればすでに入っています。次を実行するだけです。

```bash
hermes acp
```

（`[all]` なしで入れた場合は、先に `cd ~/.hermes/hermes-agent && uv pip install -e ".[acp]"` を実行してください。）

[ACP でのエディター連携](/hermes/docs/user-guide/features/acp/) を参照してください。

---

## よくあるつまずき {#common-failure-modes}

時間をいちばん食う問題は次のとおりです。

| 症状 | ありそうな原因 | 直し方 |
|---|---|---|
| Hermes は起動するが、返事が空だったり壊れていたりする | プロバイダーの認証かモデルの選択が間違っている | `hermes model` をもう一度実行し、プロバイダー、モデル、認証を確認する |
| 独自の接続先が「動いて」はいるが、返事が意味不明 | ベース URL かモデル名が違う、あるいは実は OpenAI 互換ではない | まず別のクライアントで接続先を確かめる |
| ゲートウェイは起動するが、誰もメッセージを送れない | ボットのトークン、許可リスト、入口の設定が途中で止まっている | `hermes gateway setup` をやり直し、`hermes gateway status` を確認する |
| `hermes --continue` が前の会話を見つけられない | プロファイルを切り替えたか、会話が保存されていない | `hermes sessions list` を見て、正しいプロファイルにいるか確認する |
| モデルが使えない、切り替わり方がおかしい | プロバイダーの振り分けや切り替えの設定が強すぎる | 元のプロバイダーが安定するまで、振り分けは切っておく |
| `hermes doctor` が設定の問題を指摘する | 設定の値が足りないか古い | 設定を直し、機能を足す前に素の会話でもう一度確かめる |

## 立て直しの道具箱 {#recovery-toolkit}

何かおかしいと感じたら、この順に試してください。

1. `hermes doctor`
2. `hermes model`
3. `hermes setup`
4. `hermes sessions list`
5. `hermes --continue`
6. `hermes gateway status`

この順番なら、「なんだか壊れている」状態から、分かっている状態まで早く戻れます。

---

## 早見表 {#quick-reference}

| コマンド | 説明 |
|---------|-------------|
| `hermes` | 会話を始めます |
| `hermes model` | 使う LLM のプロバイダーとモデルを選びます |
| `hermes tools` | 入口ごとに、どのツールを有効にするかを設定します |
| `hermes setup` | 初期設定をひととおり行います（まとめて全部設定します） |
| `hermes doctor` | 不具合を診断します |
| `hermes update` | 最新版に更新します |
| `hermes gateway` | メッセージのゲートウェイを起動します |
| `hermes --continue` | 直前の会話を再開します |

## 次の一歩 {#next-steps}

- **[CLI の案内](/hermes/docs/user-guide/cli/)** — 端末での使い方を身につける
- **[設定](/hermes/docs/user-guide/configuration/)** — 自分に合わせて調整する
- **[メッセージのゲートウェイ](/hermes/docs/user-guide/messaging/)** — Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant、Teams などにつなぐ
- **[ツールとツール群](/hermes/docs/user-guide/features/tools/)** — 何ができるのかを見て回る
- **[AI プロバイダー](/hermes/docs/integrations/providers/)** — プロバイダーの全一覧と設定の詳細
- **[スキルの仕組み](/hermes/docs/user-guide/features/skills/)** — 繰り返し使える手順と知識
- **[コツと勘どころ](/hermes/docs/guides/tips/)** — 使い込んだ人向けのコツ
- **[別の端末へ移る](/hermes/docs/reference/faq/#exporting-hermes-to-another-machine)** — `hermes backup` で環境をまるごと引っ越せます（[プロファイル 1 つだけ](/hermes/docs/reference/faq/#moving-a-single-profile-to-another-machine) も可）。一から作り直す必要はありません
