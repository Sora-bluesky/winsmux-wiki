---
title: "よくある質問とトラブル対処"
description: "Hermes Agent でよくある質問と、つまずきやすい箇所の対処法"
upstream_path: reference/faq.md
upstream_blob: 7dfc0d3ebdbd177c6e1aa4103eae652c9741a87e
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/faq
---

# よくある質問とトラブル対処 {#faq-troubleshooting}

よく寄せられる質問と、つまずきやすい箇所の直し方をまとめました。

---

## よくある質問 {#frequently-asked-questions}

### Hermes ではどの LLM プロバイダーを使えますか {#what-llm-providers-work-with-hermes}

Hermes Agent は OpenAI 互換の API であれば動きます。対応しているプロバイダーは次のとおりです。

- **[OpenRouter](https://openrouter.ai/)** — ひとつの API キーで数百のモデルを使えます（使い分けの自由度を求めるならこれ）
- **[Nous Portal](/hermes/docs/integrations/nous-portal/)** — Nous Research のサブスクリプション窓口です。OAuth ログイン 1 回で 300 以上のモデルに加えて、Web 検索・画像・音声合成・ブラウザまで使えます（初めての方におすすめ）
- **OpenAI** — GPT-5.4、GPT-5-codex、GPT-4.1、GPT-4o など
- **Anthropic** — Claude 系のモデル（API を直接叩く、`hermes auth add anthropic` で OAuth を通す、OpenRouter を挟む、互換プロキシを立てる、のいずれでも可）
- **Google** — Gemini 系のモデル（`gemini` プロバイダーで直接、OpenRouter 経由、互換プロキシのいずれでも可）
- **z.ai / ZhipuAI** — GLM 系のモデル
- **Kimi / Moonshot AI** — Kimi 系のモデル
- **MiniMax** — グローバル版と中国国内版のエンドポイント
- **ローカルモデル** — [Ollama](https://ollama.com/)、[vLLM](https://docs.vllm.ai/)、[llama.cpp](https://github.com/ggerganov/llama.cpp)、[SGLang](https://github.com/sgl-project/sglang) など、OpenAI 互換のサーバーであれば何でも

プロバイダーの指定は `hermes model` を実行するか、`~/.hermes/.env` を直接編集して行います。プロバイダーごとのキー名は [環境変数](/hermes/docs/reference/environment-variables/) の一覧にすべて載っています。

### Windows や Android、Termux、手元の環境でも動きますか {#does-it-work-on-windowsandroidtermuxmy-plataform}
対応環境の一覧は **[対応プラットフォーム](/hermes/docs/getting-started/platform-support/)** にまとめてあります。

### WSL2 で Hermes を動かしています。Windows 側の Chrome を操作する良い方法はありますか {#i-run-hermes-in-wsl2-whats-the-best-way-to-control-my-normal-windows-chrome}

`/browser connect` を使うより、MCP のブリッジを挟むほうがうまくいきます。

おすすめの組み立て方は次のとおりです。

- Hermes は WSL2 の中で動かす
- Windows 側のログイン済み Chrome はそのまま使う
- `cmd.exe` か `powershell.exe` を通して `chrome-devtools-mcp` を MCP サーバーとして登録する
- Hermes には、そこで生えたブラウザ操作ツールを使わせる

Hermes 本体のブラウザ通信を WSL2 と Windows の境界をまたいで直接つながせるより、この形のほうが安定します。

関連ページ:

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/#wsl2-bridge-hermes-in-wsl-to-windows-chrome)
- [ブラウザ操作](/hermes/docs/user-guide/features/browser/#wsl2--windows-chrome-prefer-mcp-over-browser-connect)

### 入力した内容はどこかに送られますか {#is-my-data-sent-anywhere}

API リクエストは **自分で設定したプロバイダーだけ** に送られます（OpenRouter や、手元で動かしている Ollama など）。Hermes Agent 側が利用状況や解析データを集めることはありません。会話・記憶・スキルはすべて手元の `~/.hermes/` に保存されます。

### オフラインやローカルモデルでも使えますか {#can-i-use-it-offline-with-local-models}

使えます。`hermes model` を実行して **Custom endpoint** を選び、自分のサーバーの URL を入力してください。

```bash
hermes model
# Select: Custom endpoint (enter URL manually)
# API base URL: http://localhost:11434/v1
# API key: ollama
# Model name: qwen3.5:27b
# Context length: 64000   ← Hermes minimum; set this to match your server's actual context window
```

`config.yaml` に直接書いても構いません。

```yaml
model:
  default: qwen3.5:27b
  provider: custom
  base_url: http://localhost:11434/v1
```

Hermes はエンドポイント・プロバイダー・ベース URL を `config.yaml` に保存するので、再起動しても設定は残ります。ローカルサーバーに読み込んでいるモデルが 1 つだけなら、`/model custom` が自動で見つけてくれます。config.yaml に `provider: custom` と書くこともできます。これは何かの別名ではなく、独立したプロバイダーとして扱われます。

Ollama、vLLM、llama.cpp のサーバー、SGLang、LocalAI などで動作します。詳しくは [設定ガイド](/hermes/docs/user-guide/configuration/) をご覧ください。

:::tip Ollama を使う場合
Ollama 側で `num_ctx` を独自に設定している場合（例: `ollama run --num_ctx 64000`）、Hermes 側にも同じコンテキスト長を設定してください。Ollama の `/api/show` が返すのはモデルの *最大* コンテキスト長で、実際に指定した `num_ctx` ではありません。
:::

:::tip ローカルモデルでのタイムアウト
Hermes はローカルのエンドポイントを自動で見分け、ストリーミングのタイムアウトを緩めます（読み取りのタイムアウトを 120 秒から 1800 秒に延ばし、応答が止まったかどうかの検知を切ります）。それでも巨大なコンテキストでタイムアウトするなら、`.env` に `HERMES_STREAM_READ_TIMEOUT=1800` を書いてください。詳しくは [ローカル LLM ガイド](/hermes/docs/guides/local-llm-on-mac/#timeouts) をご覧ください。
:::

### 費用はどのくらいかかりますか {#how-much-does-it-cost}

Hermes Agent 自体は **無料のオープンソース** です（MIT ライセンス）。かかるのは選んだプロバイダーの LLM 利用料だけです。ローカルモデルなら料金は一切かかりません。

### 複数人で 1 つのインスタンスを使えますか {#can-multiple-people-use-one-instance}

使えます。[メッセージゲートウェイ](/hermes/docs/user-guide/messaging/) を通せば、Telegram・Discord・Slack・WhatsApp・Home Assistant から同じ Hermes Agent に複数人がやり取りできます。誰が使えるかは、許可リスト（ユーザー ID を並べる方式）と DM ペアリング（最初に話しかけた人が使用権を取る方式）で制御します。

### 記憶とスキルは何が違いますか {#whats-the-difference-between-memory-and-skills}

- **記憶** は **事実** をためます。使う人のこと、進行中のプロジェクト、好みなど、エージェントが知っている情報です。関連しそうな場面で自動的に引き出されます。
- **スキル** は **手順** をためます。何かをやるときの段取りを書いたものです。似た作業に出くわしたときに呼び出されます。

どちらもセッションをまたいで残ります。詳しくは [記憶](/hermes/docs/user-guide/features/memory/) と [スキル](/hermes/docs/user-guide/features/skills/) をご覧ください。

### 自分の Python プロジェクトから使えますか {#can-i-use-it-in-my-own-python-project}

使えます。`AIAgent` クラスを読み込めば、Hermes をプログラムから呼び出せます。

```python
from run_agent import AIAgent

agent = AIAgent(model="anthropic/claude-opus-4.7")
response = agent.chat("Explain quantum computing briefly")
```

API の使い方は [Python ライブラリガイド](/hermes/docs/user-guide/features/code-execution/) にまとまっています。

---

## トラブル対処 {#troubleshooting}

### インストール時の問題 {#installation-issues}

#### インストールしたのに `hermes: command not found` になる {#hermes-command-not-found-after-installation}

**原因:** シェルが新しい PATH を読み直していません。

**対処:**
```bash
# Reload your shell profile
source ~/.bashrc    # bash
source ~/.zshrc     # zsh

# Or start a new terminal session
```

これでも直らないときは、インストール先を確認します。
```bash
which hermes
ls ~/.local/bin/hermes
```

:::tip
インストーラーは PATH に `~/.local/bin` を追加します。独自のシェル設定を使っている場合は、`export PATH="$HOME/.local/bin:$PATH"` を自分で書き足してください。
:::

#### Python のバージョンが古い {#python-version-too-old}

**原因:** Hermes は Python 3.11 以上が必要です。

**対処:**
```bash
python3 --version   # Check current version

# Install a newer Python
sudo apt install python3.12   # Ubuntu/Debian
brew install python@3.12      # macOS
```

インストーラーを使えばここは自動で処理されます。手動インストール中にこのエラーが出たら、先に Python を上げてください。

#### ターミナル操作で `node: command not found` になる（`nvm`、`pyenv`、`asdf` なども同様） {#terminal-commands-say-node-command-not-found-or-nvm-pyenv-asdf}

**原因:** Hermes は起動時に `bash -l` を 1 回走らせ、そのセッション用の環境を写し取ります。bash のログインシェルは `/etc/profile`、`~/.bash_profile`、`~/.profile` を読みますが、**`~/.bashrc` は読み込みません**。そのため、そこに自分を書き込むツール（`nvm`、`asdf`、`pyenv`、`cargo`、独自の `PATH` 追記）は写し取った環境から見えなくなります。systemd 配下で Hermes を動かしている場合や、対話シェルの設定が何も読み込まれていない最小構成のシェルで起きやすい現象です。

**対処:** Hermes は既定で `~/.bashrc` を自動的に読み込みます。それでも足りないとき、たとえば PATH を `~/.zshrc` に書いている zsh 利用者や、`nvm` を単独ファイルから初期化している場合は、追加で読み込ませたいファイルを `~/.hermes/config.yaml` に並べてください。

```yaml
terminal:
  shell_init_files:
    - ~/.zshrc                     # zsh users: pulls zsh-managed PATH into the bash snapshot
    - ~/.nvm/nvm.sh                # direct nvm init (works regardless of shell)
    - /etc/profile.d/cargo.sh      # system-wide rc files
  # When this list is set, the default ~/.bashrc auto-source is NOT added —
  # include it explicitly if you want both:
  #   - ~/.bashrc
  #   - ~/.zshrc
```

存在しないファイルは何も言わずに読み飛ばされます。読み込みは bash で行われるため、zsh 固有の書き方に頼っているファイルはエラーになることがあります。心配なら、rc ファイル全体ではなく PATH を設定している部分だけ（たとえば nvm の `nvm.sh` を直接）読ませてください。

自動読み込みをやめて、ログインシェルの挙動だけに揃えたい場合はこうします。

```yaml
terminal:
  auto_source_bashrc: false
```

#### `uv: command not found` {#uv-command-not-found}

**原因:** パッケージマネージャーの `uv` が入っていないか、PATH に載っていません。

**対処:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

#### インストール中に permission denied が出る {#permission-denied-errors-during-install}

**原因:** インストール先に書き込む権限がありません。

**対処:**
```bash
# Don't use sudo with the installer — it installs to ~/.local/bin
# If you previously installed with sudo, clean up:
sudo rm /usr/local/bin/hermes
# Then re-run the standard installer
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

---

### プロバイダーとモデルの問題 {#provider-model-issues}

#### 「Hermes のポリシー」「Hermes のガードレール」で断られたと言われる {#the-agent-says-hermes-policy-or-hermes-guardrails-refused-my-request}

モデルは、自分がなぜ断ったのかを正確には説明できません。断り文句が返答の文章の中にしか出てこないなら、「Hermes 側の隠れたポリシーが原因だ」という説明はモデルの作り話か、選んでいるモデルやプロバイダー側の制限である可能性があります。

Hermes 側の制御はもっとはっきり出ます。ツールの実行がブロックされたときは、禁止されたコマンドやパスを名指ししたツールエラーが返り、承認が要る操作では承認を求める表示が出ます。Hermes がこうした実行制御を、黙って一般的な内容フィルターに読み替えることはありません。ただし Amazon Bedrock Guardrails のように、プロバイダー側の制御を設定している場合はそちらが効きます。

原因を切り分ける手順は次のとおりです。

1. `/status` を実行して、今どのモデルとプロバイダーが動いているか確かめます。
2. その断りに、実際の Hermes のツールエラーや承認プロンプトが含まれているか見ます。文章だけなら、モデルが挙げた原因を証拠として扱わないでください。
3. 新しいセッションを開き、別のモデルやプロバイダーで試します。モデルを変えると結果が変わるなら、それは Hermes の実行制御ではなくモデルやプロバイダー側の挙動です。
4. 明確なツールエラーが出ているなら、その文面をそのまま添えて報告してください。

Hermes が公式に備えている実行制御は [セキュリティ](/hermes/docs/user-guide/security/)、プロバイダー側の設定は [プロバイダー](/hermes/docs/integrations/providers/) をご覧ください。

#### `/model` に 1 つのプロバイダーしか出ない・切り替えられない {#model-only-shows-one-provider-cant-switch-providers}

**原因:** チャットの中で使う `/model` は、**すでに設定済みの** プロバイダー間でしか切り替えられません。OpenRouter しか設定していなければ、`/model` にはそれしか出てきません。

**対処:** いったんセッションを抜けて、ターミナルから `hermes model` を実行し、プロバイダーを追加します。

```bash
# Exit the Hermes chat session first (Ctrl+C or /quit)

# Run the full provider setup wizard
hermes model

# This lets you: add providers, run OAuth, enter API keys, configure endpoints
```

`hermes model` でプロバイダーを追加したら、新しいチャットを開いてください。`/model` に設定済みのプロバイダーがすべて並びます。

:::tip 早見表
| やりたいこと | 使うもの |
|-----------|-----|
| プロバイダーを追加する | `hermes model`（ターミナルから） |
| API キーを入力・変更する | `hermes model`（ターミナルから） |
| 会話の途中でモデルを切り替える | `/model <name>`（セッション内） |
| 設定済みの別プロバイダーに切り替える | `/model provider:model`（セッション内） |
:::

#### API キーが通らない {#api-key-not-working}

**原因:** キーが未設定・期限切れ・書き間違い、あるいは別のプロバイダー用のキーです。

**対処:**
```bash
# Check your configuration
hermes config show

# Re-configure your provider
hermes model

# Or set directly
hermes config set OPENROUTER_API_KEY sk-or-v1-xxxxxxxxxxxx
```

:::warning
キーとプロバイダーの組み合わせが合っているか確認してください。OpenAI のキーは OpenRouter では通りませんし、その逆も同じです。`~/.hermes/.env` に競合する記述が残っていないかも見てください。
:::

#### モデルが見つからない・使えない {#model-not-available-model-not-found}

**原因:** モデル名が間違っているか、そのプロバイダーでは提供されていません。

**対処:**
```bash
# List available models for your provider
hermes model

# Set a valid model
hermes config set HERMES_MODEL anthropic/claude-opus-4.7

# Or specify per-session
hermes chat --model openrouter/meta-llama/llama-3.1-70b-instruct
```

#### レート制限（429 エラー） {#rate-limiting-429-errors}

**原因:** プロバイダー側の利用制限に引っかかっています。

**対処:** 少し待ってから再実行してください。日常的に上限に当たるなら、次を検討します。
- プロバイダーのプランを上げる
- 別のモデルやプロバイダーに乗り換える
- `hermes chat --provider <alternative>` で別の接続先に振り分ける

#### コンテキスト長を超えた {#context-length-exceeded}

**原因:** 会話が長くなってモデルのコンテキスト枠を超えたか、Hermes がそのモデルのコンテキスト長を取り違えています。

**対処:**
```bash
# Compress the current session
/compress

# Or start a fresh session
hermes chat

# Use a model with a larger context window
hermes chat --model openrouter/google/gemini-3-flash-preview
```

長い会話の 1 回目でこれが出るなら、Hermes がそのモデルのコンテキスト長を誤って判定している可能性があります。何と認識しているか確認してください。

CLI の起動時の行に、検出したコンテキスト長が出ます（例: `📊 Context limit: 128000 tokens`）。セッション中なら `/usage` でも確認できます。

**エラーを返さずに黙り込むローカルサーバー（llama.cpp、Ollama）の場合:** リクエストが大きすぎるとプロバイダーに拒否されると、Hermes は会話を圧縮してリクエストを組み立て直します。再試行の前に、組み立て直した*リクエスト全体*（システムプロンプト + ツールスキーマ + メッセージ）を測り直し、まだしきい値を超えていれば、回数を区切った圧縮をさらに走らせます。それでも収まらない場合は、llama.cpp が黙って切り詰めてしまうような特大のリクエストを送る代わりに、`Context length exceeded: compression could not reduce the rebuilt request below the safe threshold` を出してそのターンを終えます（切り詰められると、サーバーのログに `stop processing: n_tokens = 65535, truncated = 1` と出ます）。このメッセージが出たときは、ほぼ確実に上に挙げた `context_length` の設定が原因です。サーバー側で実際に指定している `-c` / `--ctx-size` に合わせてください。

判定を直すには、明示的に指定します。

```yaml
# In ~/.hermes/config.yaml
model:
  default: your-model-name
  context_length: 131072  # your model's actual context window
```

独自エンドポイントの場合は、プロバイダーの項目にモデルごとの値を足します。

```yaml
providers:
  my-server:
    api: "http://localhost:11434/v1"
    models:
      qwen3.5:27b:
        context_length: 64000
```

（古い設定では `custom_providers:` というリストを使っていました。今も動きますし、自動で `providers:` に移し替えられます。）

自動判定の仕組みと、上書きの方法すべては [コンテキスト長の検出](/hermes/docs/integrations/providers/#context-length-detection) をご覧ください。

---

### ターミナルの問題 {#terminal-issues}

#### コマンドが危険と判断されて止まる {#command-blocked-as-dangerous}

**原因:** Hermes が破壊的な可能性のあるコマンド（`rm -rf`、`DROP TABLE` など）を検出しました。安全のための仕組みです。

**対処:** 確認を求められたらコマンドを読み、問題なければ `y` と入力して許可します。ほかにこんな手もあります。
- もっと安全なやり方を使うようエージェントに頼む
- 危険と判断されるパターンの一覧は [セキュリティのページ](/hermes/docs/user-guide/security/) にあります

:::tip
これは意図した動きです。Hermes が破壊的なコマンドを黙って実行することはありません。承認を求める画面には、これから何が動くのかがそのまま表示されます。
:::

#### メッセージゲートウェイ経由だと `sudo` が使えない {#sudo-not-working-via-messaging-gateway}

**原因:** メッセージゲートウェイは対話できるターミナルを持たないため、`sudo` がパスワードを尋ねられません。

**対処:**
- メッセージ経由では `sudo` を避け、別のやり方をエージェントに探してもらう
- どうしても `sudo` が必要なら、`/etc/sudoers` で特定のコマンドだけパスワードなしで実行できるよう設定する
- 管理作業はターミナル側に切り替える: `hermes chat`

#### Docker バックエンドにつながらない {#docker-backend-not-connecting}

**原因:** Docker のデーモンが動いていないか、ユーザーに権限がありません。

**対処:**
```bash
# Check Docker is running
docker info

# Add your user to the docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker run hello-world
```

---

### メッセージ連携の問題 {#messaging-issues}

#### ボットが反応しない {#bot-not-responding-to-messages}

**原因:** ボットが起動していない、認証が通っていない、あるいは自分が許可リストに入っていません。

**対処:**
```bash
# Check if the gateway is running
hermes gateway status

# Start the gateway
hermes gateway start

# Check logs for errors
cat ~/.hermes/logs/gateway.log | tail -50
```

#### メッセージが届かない {#messages-not-delivering}

**原因:** ネットワークの問題、ボットのトークンの期限切れ、プラットフォーム側の Webhook 設定の誤りなどです。

**対処:**
- `hermes gateway setup` でボットのトークンが有効か確かめる
- ゲートウェイのログを見る: `cat ~/.hermes/logs/gateway.log | tail -50`
- Webhook を使うプラットフォーム（Slack、WhatsApp）では、自分のサーバーが外から届く状態か確認する

#### 許可リストがよくわからない。誰がボットに話しかけられるのか {#allowlist-confusion-who-can-talk-to-the-bot}

**原因:** 認証モードによって、誰が使えるかが決まります。

**対処:**

| モード | 動き方 |
|------|-------------|
| **許可リスト** | 設定に書いたユーザー ID だけがやり取りできます |
| **DM ペアリング** | DM で最初に話しかけた人が使用権を独占します |
| **オープン** | 誰でもやり取りできます（本番運用にはおすすめしません） |

設定は `~/.hermes/config.yaml` の、各ゲートウェイの項目で行います。[メッセージ連携のページ](/hermes/docs/user-guide/messaging/) もご覧ください。

#### ゲートウェイが起動しない {#gateway-wont-start}

**原因:** 依存パッケージの不足、ポートの取り合い、トークンの設定ミスなどです。

**対処:**
```bash
# Install core messaging gateway dependencies
cd ~/.hermes/hermes-agent && uv pip install -e ".[messaging]"  # Telegram, Discord, Slack, and shared gateway deps

# Check for port conflicts
lsof -i :8080

# Verify configuration
hermes config show
```

#### WSL でゲートウェイが切れ続ける、`hermes gateway start` が失敗する {#wsl-gateway-keeps-disconnecting-or-hermes-gateway-start-fails}

**原因:** WSL の systemd 対応は当てになりません。WSL2 では systemd が有効になっていない環境が多く、有効にしても WSL の再起動や Windows のアイドル終了でサービスが落ちることがあります。

**対処:** systemd のサービスにせず、フォアグラウンドで動かします。

```bash
# Option 1: Direct foreground (simplest)
hermes gateway run

# Option 2: Persistent via tmux (survives terminal close)
tmux new -s hermes 'hermes gateway run'
# Reattach later: tmux attach -t hermes

# Option 3: Background via nohup
nohup hermes gateway run > ~/.hermes/logs/gateway.log 2>&1 &
```

それでも systemd を試したい場合は、有効になっているか確かめてください。

1. `/etc/wsl.conf` を開きます（無ければ作ります）
2. 次を書き足します:
   ```ini
   [boot]
   systemd=true
   ```
3. PowerShell から `wsl --shutdown` を実行します
4. WSL のターミナルを開き直します
5. 確認します。`systemctl is-system-running` が "running" か "degraded" を返せば大丈夫です

:::tip Windows 起動時に自動で立ち上げる
確実に自動起動させたいなら、Windows のタスク スケジューラでログイン時に WSL とゲートウェイを起動させます。
1. `wsl -d Ubuntu -- bash -lc 'hermes gateway run'` を実行するタスクを作ります
2. トリガーをユーザーのログオンに設定します
:::

#### macOS でゲートウェイから Node.js や ffmpeg などが見つからない {#macos-nodejs-ffmpeg-other-tools-not-found-by-gateway}

**原因:** launchd のサービスは最小限の PATH（`/usr/bin:/bin:/usr/sbin:/sbin`）しか受け継ぎません。ここには Homebrew や nvm、cargo など、自分で入れたツールの置き場が含まれていません。WhatsApp ブリッジが `node not found` で動かない、音声の書き起こしが `ffmpeg not found` になる、といった形で表面化します。

**対処:** ゲートウェイは `hermes gateway install` を実行した時点のシェルの PATH を記録します。ゲートウェイを用意したあとにツールを入れたなら、install をやり直して新しい PATH を取り込ませてください。

```bash
hermes gateway install    # Re-snapshots your current PATH
hermes gateway start      # Detects the updated plist and reloads
```

plist に正しい PATH が入ったかは、こうして確認できます。
```bash
/usr/libexec/PlistBuddy -c "Print :EnvironmentVariables:PATH" \
  ~/Library/LaunchAgents/ai.hermes.gateway.plist
```

---

### 速度・負荷の問題 {#performance-issues}

#### 応答が遅い {#slow-responses}

**原因:** モデルが大きい、API サーバーが遠い、あるいはツールを盛り込んだシステムプロンプトが重くなっています。

**対処:**
- もっと速い・小さいモデルを試す: `hermes chat --model openrouter/meta-llama/llama-3.1-8b-instruct`
- 有効なツールセットを絞る: `hermes chat -t "terminal"`
- プロバイダーまでの通信の遅さを確認する
- ローカルモデルなら、GPU の VRAM が足りているか確かめる

#### トークンを使いすぎる {#high-token-usage}

**原因:** 会話が長い、システムプロンプトが冗長、ツール呼び出しが積み重なってコンテキストが膨らんでいる、などです。

**対処:**
```bash
# See exactly what the fixed prompt costs — breakdown by block
# (system prompt, skills index, memory, tool schemas). Runs offline.
hermes prompt-size

# Compress the conversation to reduce tokens
/compress

# Check session token usage
/usage
```

まだ何も入力していないのに数字が大きいなら、それは毎回必ず送られる分です。システムプロンプトとツールの定義が該当します。[`hermes prompt-size`](/hermes/docs/reference/cli-commands/#hermes-prompt-size) で内訳を測ってから削っていきましょう。使っていないツールセットを切り（`hermes tools`）、要らないスキルを消すか無効にします（`hermes skills`）。

:::tip
長いセッションでは `/compress` をこまめに使ってください。会話の履歴を要約して、話の流れを保ったままトークン消費を大きく減らせます。
:::

#### セッションが長くなりすぎた {#session-getting-too-long}

**原因:** 会話が続くとメッセージやツールの出力がたまり、コンテキストの上限に近づきます。

**対処:**
```bash
# Compress current session (preserves key context)
/compress

# Start a new session with a reference to the old one
hermes chat

# Resume a specific session later if needed
hermes chat --continue
```

---

### MCP の問題 {#mcp-issues}

#### MCP サーバーにつながらない {#mcp-server-not-connecting}

**原因:** サーバーの実行ファイルが見つからない、コマンドのパスが違う、実行環境が入っていない、などです。

**対処:**
```bash
# Ensure MCP dependencies are installed (already included in standard install)
cd ~/.hermes/hermes-agent && uv pip install -e ".[mcp]"

# For npm-based servers, ensure Node.js is available
node --version
npx --version

# Test the server manually
npx -y @modelcontextprotocol/server-filesystem /tmp
```

`~/.hermes/config.yaml` の MCP の設定も確かめてください。
```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/docs"]
```

#### MCP サーバーのツールが出てこない {#tools-not-showing-up-from-mcp-server}

**原因:** サーバーは起動したがツールの取得に失敗した、設定でツールが除外されていた、あるいはそのサーバーが期待した MCP の機能に対応していない、などです。

**対処:**
- ゲートウェイやエージェントのログに MCP の接続エラーが出ていないか確認する
- サーバーが `tools/list` の RPC に応答するか確かめる
- そのサーバーの下にある `tools.include`、`tools.exclude`、`tools.resources`、`tools.prompts`、`enabled` の設定を見直す
- リソースやプロンプトを扱う補助ツールは、セッションがその機能に対応しているときだけ登録されることを覚えておく
- 設定を変えたら `/reload-mcp` を実行する

```bash
# Verify MCP servers are configured
hermes config show | grep -A 12 mcp_servers

# Restart Hermes or reload MCP after config changes
hermes chat
```

関連ページ:
- [MCP（Model Context Protocol）](/hermes/docs/user-guide/features/mcp/)
- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)
- [MCP 設定の一覧](/hermes/docs/reference/mcp-config-reference/)

#### MCP がタイムアウトする {#mcp-timeout-errors}

**原因:** MCP サーバーの応答が遅すぎるか、実行中に落ちています。

**対処:**
- MCP サーバーの設定にタイムアウトの項目があれば、値を延ばす
- MCP サーバーのプロセスがまだ生きているか確かめる
- リモートの HTTP MCP サーバーなら、ネットワークがつながっているか確かめる

:::warning
MCP サーバーがリクエストの途中で落ちると、Hermes からはタイムアウトとして見えます。原因を突き止めるには、Hermes 側だけでなくサーバー自身のログも確認してください。
:::

---

## プロファイル {#profiles}

### HERMES_HOME を設定するのと、プロファイルは何が違いますか {#how-do-profiles-differ-from-just-setting-hermeshome}

プロファイルは `HERMES_HOME` の上に乗った管理レイヤーです。コマンドを打つたびに `HERMES_HOME=/some/path` を自分で設定することも *できます* が、プロファイルはその周りの面倒をまとめて引き受けます。ディレクトリ構成を作り、シェルの別名（`hermes-work`）を生成し、今どのプロファイルが有効かを `~/.hermes/active_profile` で管理し、スキルの更新を全プロファイルへ自動で反映します。タブ補完とも連携するので、パスを覚えておく必要もありません。

### 2 つのプロファイルで同じボットのトークンを使えますか {#can-two-profiles-share-the-same-bot-token}

使えません。メッセージのプラットフォーム（Telegram、Discord など）は、ボットのトークンを 1 か所からしか使わせません。2 つのプロファイルが同じトークンを同時に使おうとすると、あとから起動したゲートウェイが接続に失敗します。プロファイルごとに別のボットを作ってください。Telegram なら [@BotFather](https://t.me/BotFather) に話しかけてボットを増やせます。

### プロファイル同士で記憶やセッションは共有されますか {#do-profiles-share-memory-or-sessions}

されません。プロファイルはそれぞれ独自の記憶・セッションのデータベース・スキルのディレクトリを持ち、互いに完全に切り離されています。今ある記憶やセッションを引き継いで新しいプロファイルを作りたいときは、`hermes profile create newname --clone-all` で現在のプロファイルの中身をまるごと複製するか、`--clone-from <profile>` で複製元を指定してください。

この分離は、*同じ* プロファイルや同じ Hermes ホームに対して 2 つのエージェントを走らせてはいけない理由でもあります。どちらも記憶を自動で書き込み、セッションの開始時に相手の書き込みを読み込むため、保存された状態はセッションのたびに崩れていきます。プロファイルにつきエージェントは 1 つです。本当に複数のエージェントで記憶を共有したいなら、[外部の記憶プロバイダー](/hermes/docs/user-guide/features/memory-providers/) を使ってください。

### `hermes update` を実行すると何が起きますか {#what-happens-when-i-run-hermes-update}

`hermes update` は最新のコードを取得し、依存パッケージを **1 回だけ** 入れ直します（プロファイルごとではありません）。そのあと、更新されたスキルを全プロファイルへ自動で反映します。`hermes update` の実行は 1 回で済み、その端末にあるすべてのプロファイルが対象になります。

### プロファイルはいくつまで作れますか {#how-many-profiles-can-i-run}

上限はありません。プロファイルの実体は `~/.hermes/profiles/` の下のディレクトリです。実際の上限は、ディスクの空きと、同時に動かせるゲートウェイの数（1 つずつが軽量な Python のプロセスです）で決まります。何十個作っても問題ありませんし、使っていないプロファイルは資源を消費しません。

---

## 使い方のパターン {#workflows-patterns}

### 用途ごとに違うモデルを使う（複数モデルの使い分け） {#using-different-models-for-different-tasks-multi-model-workflows}

**こんなとき:** ふだんは GPT-5.4 を使っているけれど、SNS の文章は Gemini や Grok のほうが上手い。そのたびに手でモデルを切り替えるのが面倒、という場面です。

**対処: 委任の設定を使います。** Hermes は、サブエージェントだけを別のモデルに自動で振り分けられます。`~/.hermes/config.yaml` に次のように書きます。

```yaml
delegation:
  model: "google/gemini-3-flash-preview"   # subagents use this model
  provider: "openrouter"                    # provider for subagents
```

こうしておくと、「X についての Twitter スレッドを書いて」と頼んで Hermes が `delegate_task` のサブエージェントを立ち上げたとき、そのサブエージェントは Gemini で動きます。本体の会話は GPT-5.4 のままです。

指示の中で明示しても構いません。たとえば *「製品リリースについての SNS 投稿を書く作業を委任してください。実際の執筆はサブエージェントにやらせてください」* のように書きます。エージェントは `delegate_task` を使い、委任の設定が自動で効きます。

委任を挟まずその場だけ切り替えたいなら、CLI で `/model` を使います。

```bash
/model google/gemini-3-flash-preview    # switch for this session
# ... write your content ...
/model openai/gpt-5.4                   # switch back
```

:::warning
`/model` で切り替えるたびに、プロンプトのキャッシュは作り直しになります。キャッシュの鍵にモデル名が入っているためで、切り替え直後の 1 通は会話全体を入力として読み直し、割引なしの料金がかかります。長いセッションでは、行ったり来たり切り替えるより、委任（サブエージェントは自分の新しいコンテキストを持ちます）か、新しいセッションを開くほうが得です。
:::

委任の仕組みについては [サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/) をご覧ください。

### 1 つの WhatsApp 番号で複数のエージェントを動かす（チャットごとの割り当て） {#running-multiple-agents-on-one-whatsapp-number-per-chat-binding}

**こんなとき:** OpenClaw では、独立したエージェントを特定の WhatsApp のチャットに結び付けられました。家族の買い物リストのグループにひとつ、個人のチャットにもうひとつ、という具合です。Hermes でも同じことができるでしょうか。

**今のところの制限:** Hermes のプロファイルは、それぞれ専用の WhatsApp 番号とセッションを必要とします。同じ番号の中で、チャットごとに別のプロファイルを割り当てることはできません。WhatsApp のブリッジ（Baileys）は、1 番号につき認証済みのセッションを 1 つしか持てないためです。

**回避策:**

1. **1 つのプロファイルで人格を切り替える。** `AGENTS.md` という文脈ファイルをチャットごとに用意するか、`/personality` コマンドでふるまいを変えます。エージェントは今どのチャットにいるかを認識できるので、それに合わせられます。

2. **決まった作業は cron に任せる。** 買い物リストの管理なら、特定のチャットを見張ってリストを更新する cron ジョブを組めば、別のエージェントを立てる必要はありません。

3. **番号を分ける。** 本当に独立したエージェントが要るなら、プロファイルごとに WhatsApp 番号を用意します。Google Voice のようなサービスの仮想番号でも動きます。

4. **Telegram か Discord を使う。** こちらのプラットフォームは、チャットごとの割り当てにもっと素直に対応しています。Telegram のグループや Discord のチャンネルごとにセッションが分かれますし、同じアカウントで複数のボットのトークン（プロファイルごとに 1 つ）を動かせます。

詳しくは [プロファイル](/hermes/docs/user-guide/profiles/) と [WhatsApp の設定](/hermes/docs/user-guide/messaging/whatsapp/) をご覧ください。

### Telegram の表示を絞る（ログや思考の過程を隠す） {#controlling-what-shows-up-in-telegram-hiding-logs-and-reasoning}

**こんなとき:** 最終的な答えだけが欲しいのに、Telegram にゲートウェイの実行ログや Hermes の思考の過程、ツール呼び出しの詳細まで出てきてしまう、という場面です。

**対処:** `config.yaml` の `display.tool_progress` で、ツールの動きをどこまで見せるかを決められます。

```yaml
display:
  tool_progress: "off"   # options: off, new, all, verbose
```

- **`off`** — 最終的な返答だけ。ツール呼び出しも思考の過程もログも出しません。
- **`new`** — 新しいツール呼び出しが起きたときに、短い 1 行で知らせます。
- **`all`** — 結果を含め、ツールの動きをすべて出します。
- **`verbose`** — ツールに渡した引数と出力まで、細かく全部出します。

メッセージのプラットフォームでは、たいてい `off` か `new` がちょうどいいはずです。`config.yaml` を編集したら、ゲートウェイを再起動すると反映されます。

セッションごとに `/verbose` コマンドで切り替えることもできます（有効にしている場合）。

```yaml
display:
  tool_progress_command: true   # enables /verbose in the gateway
```

### Telegram でスキルを整理する（スラッシュコマンドの上限） {#managing-skills-on-telegram-slash-command-limit}

**こんなとき:** Telegram にはスラッシュコマンド 100 個という上限があり、スキルが増えて超えそうになっています。Telegram では使わないスキルを無効にしたいのに、`hermes skills config` の設定が効いていないように見えます。

**対処:** `hermes skills config` を使うと、プラットフォームごとにスキルを無効にできます。設定は `config.yaml` に書き込まれます。

```yaml
skills:
  disabled: []                    # globally disabled skills
  platform_disabled:
    telegram: [skill-a, skill-b]  # disabled only on telegram
```

変更したら、**ゲートウェイを再起動してください**（`hermes gateway restart` を実行するか、落として立ち上げ直します）。Telegram のボットのコマンド一覧は、起動時に組み直されます。

:::tip
説明文がとても長いスキルは、Telegram のメニューでは 40 文字に切り詰められます。データの大きさに上限があるためです。スキルが出てこないときは、100 個という数の上限ではなく全体のデータ量が原因かもしれません。使わないスキルを無効にすれば、どちらにも効きます。
:::

### スレッドを共有するセッション（複数人で 1 つの会話） {#shared-thread-sessions-multiple-users-one-conversation}

**こんなとき:** Telegram や Discord のスレッドで、複数の人がボットに話しかけています。そのスレッドでのやり取りを、人ごとに分かれたセッションではなく、ひとつづきの会話にしたい、という場面です。

**今のところの動き:** ほとんどのプラットフォームで、Hermes はユーザー ID ごとにセッションを分けます。つまり人ごとに別の会話の文脈を持ちます。プライバシーと文脈の切り分けのために、そう設計されています。

**回避策:**

1. **Slack を使う。** Slack ではセッションがユーザーではなくスレッド単位で分かれます。同じスレッドにいる人たちはひとつの会話を共有します。まさに求めている動きで、いちばん自然な選択です。

2. **代表者ひとりが窓口になるグループにする。** 「担当者」を決めてその人が質問を取り次げば、セッションはひとつにまとまります。ほかの人は読むだけになります。

3. **Discord のチャンネルを使う。** Discord ではセッションがチャンネル単位で分かれるので、同じチャンネルにいる人は文脈を共有します。共有したい会話には専用のチャンネルを用意してください。

### Hermes を別の端末へ移す {#exporting-hermes-to-another-machine}

**こんなとき:** ひとつの端末でスキルや cron ジョブ、記憶を育ててきて、それを新しい Linux 機にまるごと移したい、という場面です。

**対処:**

1. 新しい端末に Hermes Agent を入れます。
   ```bash
   curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
   ```

2. **移す元の端末** で、まるごとのバックアップを作ります。
   ```bash
   hermes backup
   ```
   `~/.hermes/` ディレクトリ全体、つまり設定・API キー・記憶・スキル・セッション・プロファイルを zip にまとめ、ホームディレクトリに `~/hermes-backup-<timestamp>.zip` として保存します。

3. その zip を新しい端末へコピーして読み込ませます。
   ```bash
   # On the source machine
   scp ~/hermes-backup-<timestamp>.zip newmachine:~/

   # On the new machine
   hermes import ~/hermes-backup-<timestamp>.zip
   ```

4. 新しい端末で `hermes setup` を実行し、API キーとプロバイダーの設定が効いているか確かめます。

### プロファイルを 1 つだけ別の端末へ移す {#moving-a-single-profile-to-another-machine}

**こんなとき:** インストール全体ではなく、特定のプロファイルだけを移したい、あるいは誰かに渡したい、という場面です。

```bash
# On the source machine
hermes profile export work ./work-backup.tar.gz

# Copy the file to the target machine, then:
hermes profile import ./work-backup.tar.gz work
```

読み込んだプロファイルには、書き出したときの設定・記憶・セッション・スキルがすべて入っています。移した先の環境が違う場合は、パスを直したりプロバイダーの認証をやり直したりが必要になることがあります。

### `hermes backup` と `hermes profile export` の違い {#hermes-backup-vs-hermes-profile-export}

| 項目 | `hermes backup` | `hermes profile export` |
| :--- | :--- | :--- |
| **使う場面** | **端末まるごとの引っ越し** | **特定のプロファイルの持ち出し・受け渡し** |
| **範囲** | 全体（`~/.hermes` ディレクトリ全部） | 一部（プロファイル 1 つ分のディレクトリ） |
| **入るもの** | 全プロファイル、全体の設定、API キー、セッション | プロファイル 1 つ分: SOUL.md、記憶、セッション、スキル |
| **認証情報** | **入ります**（`.env` と `auth.json`） | **入りません**（安全に渡せるよう取り除かれます） |
| **形式** | `.zip` | `.tar.gz` |

**手作業でやる場合（rsync）:** 自分でファイルをコピーしたいなら、コードのリポジトリを除いてください。
```bash
rsync -av --exclude='hermes-agent' ~/.hermes/ newmachine:~/.hermes/
```

:::tip
`hermes backup` は、Hermes が動いている最中でも中身の食い違わないバックアップを作ります。書き戻すアーカイブからは、`gateway.pid` や `cron.pid` のような、その端末でしか意味のない実行時のファイルは除かれます。
:::

### インストール後にシェルを読み直すと permission denied になる {#permission-denied-when-reloading-shell-after-install}

**こんなとき:** Hermes のインストーラーを実行したあと、`source ~/.zshrc` が permission denied で失敗します。

**原因:** たいていは `~/.zshrc`（または `~/.bashrc`）のファイル権限がおかしいか、インストーラーがうまく書き込めなかったときに起きます。Hermes に固有の問題ではなく、シェルの設定ファイルの権限の問題です。

**対処:**
```bash
# Check permissions
ls -la ~/.zshrc

# Fix if needed (should be -rw-r--r-- or 644)
chmod 644 ~/.zshrc

# Then reload
source ~/.zshrc

# Or just open a new terminal window — it picks up PATH changes automatically
```

インストーラーが PATH の行を書き足したのに権限が合っていない、という場合は、自分で書き足すこともできます。
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

### 最初の実行で Error 400 になる {#error-400-on-first-agent-run}

**こんなとき:** セットアップは問題なく終わったのに、最初のチャットが HTTP 400 で失敗します。

**原因:** たいていはモデル名の食い違いです。設定したモデルがそのプロバイダーに存在しないか、API キーにそのモデルを使う権限がありません。

**対処:**
```bash
# Check what model and provider are configured
hermes config show | head -20

# Re-run model selection
hermes model

# Or test with a known-good model
hermes chat -q "hello" --model anthropic/claude-opus-4.7
```

OpenRouter を使っているなら、API キーに残高があるか確かめてください。OpenRouter の 400 は、そのモデルが有料プラン限定であるか、モデル ID の打ち間違いであることがよくあります。

---

## それでも解決しないときは {#still-stuck}

ここに載っていない問題に当たったら、次を試してください。

1. **既存の報告を探す:** [GitHub Issues](https://github.com/NousResearch/hermes-agent/issues)
2. **コミュニティに聞く:** [Nous Research Discord](https://discord.gg/nousresearch)
3. **不具合として報告する:** OS、Python のバージョン（`python3 --version`）、Hermes のバージョン（`hermes --version`）、そしてエラーメッセージの全文を添えてください
