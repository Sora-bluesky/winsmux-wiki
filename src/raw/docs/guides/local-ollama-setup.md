---
title: "Ollama で Hermes をローカルで動かす — API 料金ゼロ"
description: "Gemma 4 などのオープンウェイトモデルと Ollama を使い、クラウドの API キーも有料サブスクも使わずに Hermes Agent を自分の端末だけで動かす手順です"
upstream_path: guides/local-ollama-setup.md
upstream_blob: 2bb4b7cc31155c865f528087c44f82879700d9b5
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/local-ollama-setup
---

# Ollama で Hermes をローカルで動かす — API 料金ゼロ {#run-hermes-locally-with-ollama-zero-api-cost}

:::tip デスクトップ版にはワンクリックの近道があります
Hermes のデスクトップアプリなら、**設定 → プロバイダ → ローカルモデル** から
llama.cpp のローカルサーバーを入れて管理できます。モデルのダウンロード、メモリに収まる
設定、コンテキスト長の調整までまとめて任せられます。[ローカルモデル](/hermes/docs/user-guide/local-models/) を見てください。
このページは手作業で組み立てる場合の説明です。Ollama を使う、CLI を中心に進める、
サーバーを自分で動かす、といったときに読んでください。
:::

## 何が問題か {#the-problem}

クラウドの LLM API はトークン単位で課金されます。コーディングを集中的に進めれば、1 セッションで 5〜20 ドルかかることもあります。個人のプロジェクト、学習、プライバシーに配慮したい作業では、この金額が積み上がっていきます。しかも会話の内容は毎回、第三者へ送られています。

## この手順で解決すること {#what-this-guide-solves}

Hermes Agent を、モデルの実行基盤に [Ollama](https://ollama.com) を使って、すべて自分のハードウェア上で動かします。API キーもサブスクリプションも要らず、データが端末の外へ出ることもありません。設定が済めば、OpenRouter や Anthropic を使うときとまったく同じように動きます。ターミナルのコマンド実行、ファイル編集、ウェブの閲覧、作業の委譲まで同じで、違うのはモデルが手元で動いている点だけです。

最後まで進めると、次の状態になります。

- Ollama がオープンウェイトのモデルを 1 つ以上動かしている
- Hermes がカスタムエンドポイントとして Ollama につながっている
- ファイルを編集し、コマンドを実行し、ウェブを閲覧できるローカルのエージェントが動いている
- 必要なら、自分のハードウェアだけで動く Telegram / Discord のボットも用意できる

## 必要なもの {#what-you-need}

| 構成要素 | 最低限 | 推奨 |
|-----------|---------|-------------|
| **メモリ** | 8 GB（3B 級のモデル向け） | 32 GB 以上（27B 以上のモデル向け） |
| **ストレージ** | 空き 5 GB | 30 GB 以上（複数のモデルを置く場合） |
| **CPU** | 4 コア | 8 コア以上（AMD EPYC、Ryzen、Intel Xeon など） |
| **GPU** | 必須ではありません | VRAM 8 GB 以上の NVIDIA GPU があると大幅に速くなります |

:::tip CPU だけでも動きますが、応答は遅くなります
Ollama は CPU だけのサーバーでも動きます。最近の 8 コア CPU なら 9B のモデルでおよそ毎秒 10 トークンです。31B のモデルを CPU で動かすとさらに遅く（毎秒 2〜5 トークン程度）、1 回の応答に 30〜120 秒かかりますが、動くことは動きます。GPU があればここは劇的に改善します。CPU だけの構成では、API のタイムアウトを環境変数で延ばしてください（これは `config.yaml` の項目ではありません）。

```bash
# ~/.hermes/.env
HERMES_API_TIMEOUT=1800   # 30 minutes — generous for slow local models
```
:::

## ステップ 1: Ollama を入れる {#step-1-install-ollama}

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

動いていることを確認します。

```bash
ollama --version
curl http://localhost:11434/api/tags   # Should return {"models":[]}
```

## ステップ 2: モデルを取得する {#step-2-pull-a-model}

お使いのハードウェアに合わせて選んでください。

| モデル | ディスク使用量 | 必要なメモリ | ツール呼び出し | 向いている用途 |
|-------|-------------|------------|:------------:|----------|
| `gemma4:31b` | 約 20 GB | 24 GB 以上 | 可 | 品質重視。ツール利用と推論に強い |
| `gemma2:27b` | 約 16 GB | 20 GB 以上 | 不可 | 会話向け。ツールは使えません |
| `gemma2:9b` | 約 5 GB | 8 GB 以上 | 不可 | 軽快な会話と質疑応答。ツールは呼べません |
| `llama3.2:3b` | 約 2 GB | 4 GB 以上 | 不可 | 軽い質問に手早く答えるだけの用途 |

:::warning ツール呼び出しができるかどうかが分かれ目です
Hermes は**エージェント型**のアシスタントで、ツール呼び出しを通じてファイルを編集し、コマンドを実行し、ウェブを閲覧します。ツール呼び出しに対応していないモデルは会話しかできず、実際の操作はできません。Hermes の力を引き出すには、ツールに対応したモデル（`gemma4:31b` など）を使ってください。
:::

選んだモデルを取得します。

```bash
ollama pull gemma4:31b
```

:::info 複数のモデルを使う
モデルは何種類でも取得でき、Hermes の中で `/model` を使って切り替えられます。Ollama は必要になったモデルをメモリに読み込み、使っていないものは自動で解放します。
:::

モデルが動くことを確認します。

```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma4:31b",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }'
```

モデルの返答が入った JSON が返ってくるはずです。

## ステップ 3: Hermes を設定する {#step-3-configure-hermes}

Hermes のセットアップウィザードを実行します。

```bash
hermes setup
```

プロバイダーを聞かれたら **Custom Endpoint** を選び、次のように入力します。

- **Base URL:** `http://localhost:11434/v1`
- **API Key:** 空のままにするか `no-key` と入力します（Ollama には不要です）
- **Model:** `gemma4:31b`（または取得したモデル）

`~/.hermes/config.yaml` を直接書いてもかまいません。

```yaml
model:
  default: "gemma4:31b"
  provider: "custom"
  base_url: "http://localhost:11434/v1"
```

## ステップ 4: Hermes を使ってみる {#step-4-start-using-hermes}

```bash
hermes
```

これで完了です。完全にローカルで動くエージェントができました。さっそく試してみましょう。

```
You: List all Python files in this directory and count the lines of code in each

You: Read the README.md and summarize what this project does

You: Create a Python script that fetches the weather for Ho Chi Minh City
```

Hermes はターミナルのツールとファイル操作、そして手元のモデルを使って応えます。クラウドへの通信は発生しません。

## ステップ 5: 用途に合ったモデルを選ぶ {#step-5-pick-the-right-model-for-your-task}

どんな作業にもいちばん大きなモデルが要るわけではありません。実用的な目安を挙げます。

| 作業 | 推奨モデル | 理由 |
|------|-------------------|-----|
| ファイル編集、コード、ターミナルのコマンド | `gemma4:31b` | ツール呼び出しが安定して動く唯一のモデル |
| 手早い質疑応答（ツール不要） | `gemma2:9b` | 会話向けの用途で応答が速い |
| 軽い会話 | `llama3.2:3b` | いちばん速いものの、できることはかなり限られます |

:::note
ファイル編集、コマンド実行、ウェブ閲覧まで含めたエージェントらしい作業には、いまのところツール呼び出しに対応したローカルの選択肢として `gemma4:31b` がいちばんです。新しいモデルは [Ollama のモデルライブラリ](https://ollama.com/library) で確認してください。ツール呼び出しへの対応は急速に広がっています。
:::

セッションの途中でモデルを切り替えるには次のようにします。

```
/model gemma2:9b
```

## ステップ 6: 速度を詰める {#step-6-optimize-for-speed}

### Ollama のコンテキスト長を広げる {#increase-ollamas-context-window}

Ollama の既定のコンテキストは 2048 トークンです。ツールを使うエージェントの作業には、Hermes は最低でも 64,000 トークンを必要とします。

```bash
# Create a Modelfile that extends context
cat > /tmp/Modelfile << 'EOF'
FROM gemma4:31b
PARAMETER num_ctx 64000
EOF

ollama create gemma4-64k -f /tmp/Modelfile
```

そのうえで、Hermes の設定のモデル名を `gemma4-64k` に変更します。

### モデルを読み込んだままにする {#keep-the-model-loaded}

Ollama は既定で、5 分間使われなかったモデルをメモリから解放します。常駐させるゲートウェイのボットでは、読み込んだままにしておきましょう。

```bash
# Set keep-alive to 24 hours
curl http://localhost:11434/api/generate \
  -d '{"model": "gemma4:31b", "keep_alive": "24h"}'
```

Ollama の環境変数で全体に効かせることもできます。

```bash
# /etc/systemd/system/ollama.service.d/override.conf
[Service]
Environment="OLLAMA_KEEP_ALIVE=24h"
```

### GPU に処理を振る（使える場合） {#use-gpu-offloading-if-available}

NVIDIA の GPU があれば、Ollama は自動でレイヤーを GPU に振り分けます。確認はこちらです。

```bash
ollama ps   # Shows which model is loaded and how many GPU layers
```

12 GB の GPU で 31B のモデルを動かすと部分的な振り分けになりますが（GPU に約 40 レイヤー、残りは CPU）、それでも十分な速度向上が得られます。

## ステップ 7: ゲートウェイのボットとして動かす（任意） {#step-7-run-as-a-gateway-bot-optional}

コマンドラインで Hermes がローカルに動くようになったら、Telegram や Discord のボットとして公開できます。処理はすべて自分のハードウェアの中で完結したままです。

### Telegram {#telegram}

1. [@BotFather](https://t.me/BotFather) でボットを作り、トークンを受け取ります
2. `~/.hermes/config.yaml` に次を追加します

```yaml
model:
  default: "gemma4:31b"
  provider: "custom"
  base_url: "http://localhost:11434/v1"

platforms:
  telegram:
    enabled: true
    token: "YOUR_TELEGRAM_BOT_TOKEN"
```

3. ゲートウェイを起動します

```bash
hermes gateway
```

これで Telegram からボットに話しかけると、手元のモデルが応答します。

### Discord {#discord}

1. [discord.com/developers](https://discord.com/developers/applications) で Discord アプリケーションを作ります
2. 設定に次を追加します

```yaml
platforms:
  discord:
    enabled: true
    token: "YOUR_DISCORD_BOT_TOKEN"
```

3. 起動します: `hermes gateway`

## ステップ 8: フォールバックを用意する（任意） {#step-8-set-up-fallbacks-optional}

ローカルのモデルは、込み入った作業では力不足になることがあります。ローカルのモデルが失敗したときだけ動くクラウドのフォールバックを設定しておきましょう。

```yaml
model:
  default: "gemma4:31b"
  provider: "custom"
  base_url: "http://localhost:11434/v1"

fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

こうしておけば利用の 9 割は無料（ローカル）で済み、難しい作業のときだけ有料の API を使うことになります。

## 困ったときは {#troubleshooting}

### 起動時に「Connection refused」と出る {#connection-refused-on-startup}

Ollama が動いていません。起動してください。

```bash
sudo systemctl start ollama
# or
ollama serve
```

### 応答が遅い {#slow-responses}

- **モデルの大きさとメモリを見比べる:** モデルが搭載メモリより多くを必要とすると、ディスクへのスワップが発生します。小さいモデルにするか、メモリを増設してください。
- **`ollama ps` を確認する:** GPU に振り分けられたレイヤーがなければ、処理は CPU 頼みです。CPU だけのサーバーではこれが普通の状態です。
- **コンテキストを減らす:** 会話が長くなるほど推論は遅くなります。こまめに `/compress` を使うか、設定で圧縮のしきい値を下げてください。

### 最初の応答が遅い（プリフィル） {#slow-first-response-prefill}

Hermes は API 呼び出しのたびに、会話の内容の前に決まった中身を送ります。システムプロンプトと、有効になっているすべてのツールのスキーマです。CPU だけ、あるいは VRAM の少ない構成では、この入力の処理（*プリフィル* の段階）が最初のターンの大半を占めます。モデルがプロンプトを読み込んでいる数分間は何も出力されず、そのあと通常の速度で生成が始まります。これは想定どおりの挙動で、固まっているわけではありません。[Mac でローカル LLM を動かす手順](/hermes/docs/guides/local-llm-on-mac/#timeouts) にも同じ現象の説明があり（大きなコンテキストのプリフィル中、ローカルのモデルは数分間まったく出力しないことがあります）、Hermes はローカルのエンドポイントに対してストリームの読み取りタイムアウトを 120 秒から 1800 秒へ自動で引き上げます（`HERMES_STREAM_READ_TIMEOUT`）。

効果があるのは次の対処です。

- **モデルを読み込んだままにする** — Ollama は 5 分間使われなかったモデルを解放するため、次のプリフィルの前に読み込み直しが丸ごと入ります。`OLLAMA_KEEP_ALIVE=24h` を設定してください（[ステップ 6](#keep-the-model-loaded) を参照）。
- **API のタイムアウトを延ばす** — `~/.hermes/.env` に `HERMES_API_TIMEOUT=1800` を設定します（[必要なもの](#what-you-need) を参照）。
- **決まった中身を測って削る** — `hermes prompt-size` を実行するとシステムプロンプトとツールのスキーマの内訳がバイト単位で分かります。そのうえで `hermes tools` で使っていないツールセットを無効にし、`hermes skills` で不要なスキルを削除してください。
- **GPU に処理を振る** — 部分的な振り分けでも十分な速度向上が得られます（[ステップ 6](#use-gpu-offloading-if-available) を参照）。

### モデルがツール呼び出しどおりに動かない {#model-doesnt-follow-tool-calls}

ツール呼び出しに対応していないモデルは、構造化された関数呼び出しではなく、ただのテキストを返します。対処は次のとおりです。

- **ツール呼び出しに対応したモデルを使う** — 上に挙げたモデルの中では、安定してツールを呼べるのは `gemma4:31b` だけです。
- **Hermes には自動修復があります** — 形式の崩れたツール呼び出しを検出し、自動で直そうとします。
- **フォールバックを設定する** — ローカルのモデルが 3 回失敗すると、Hermes はクラウドのプロバイダーへ切り替えます。

ツールを実際に実行せず、返答の中に `{"name": "web_search", ...}` のような生の JSON が出てくる場合、原因はたいていモデルではなく*サーバー*側です。ツール呼び出しが有効になっていないか、ツール呼び出しの形式が解釈されていません。[ツール呼び出しが実行されずテキストとして出てくる](/hermes/docs/integrations/providers/#tool-calls-appear-as-text-instead-of-executing) にある、サーバーごとの対処表を確認してください（llama.cpp には `--jinja`、vLLM には `--enable-auto-tool-choice --tool-call-parser hermes` が必要、といった具合です）。

### コンテキスト長のエラーが出る {#context-window-errors}

Ollama の既定のコンテキスト（2048 トークン）は、エージェントの作業には小さすぎます。広げ方は [ステップ 6](#step-6-optimize-for-speed) を参照してください。

## 費用の比較 {#cost-comparison}

一般的なコーディングのセッション（入力 10 万トークン、出力 2 万トークン程度）を基準に、ローカルで動かすとクラウドの API に比べてどれだけ節約できるかを示します。

| プロバイダー | 1 セッションあたり | 月額（毎日使った場合） |
|----------|-----------------|---------------------|
| Anthropic Claude Sonnet | 約 0.80 ドル | 約 24 ドル |
| OpenRouter（GPT-4o） | 約 0.60 ドル | 約 18 ドル |
| **Ollama（ローカル）** | **0.00 ドル** | **0.00 ドル** |

かかるのは電気代だけで、ハードウェアにもよりますが 1 セッションあたり 0.01〜0.05 ドル程度です。

## ローカルでもうまくいくこと {#what-works-well-locally}

- **ファイル編集とコード生成** — 9B 以上のモデルなら十分にこなせます
- **ターミナルのコマンド** — Hermes がコマンドを組み立てて実行し、出力を読むので、モデルによらず動きます
- **ウェブの閲覧** — 取得はブラウザのツールが行い、モデルは結果を読み解くだけです
- **cron や定期実行** — クラウド構成とまったく同じように動きます
- **複数プラットフォームのゲートウェイ** — Telegram、Discord、Slack のいずれもローカルのモデルで動きます

## クラウドのモデルのほうが得意なこと {#whats-better-with-cloud-models}

- **かなり込み入った多段の推論** — 70B 以上のモデルや、Claude Opus のようなクラウドのモデルのほうが目に見えて優れています
- **長いコンテキスト** — クラウドのモデルは 10 万〜100 万トークンに対応しますが、ローカルの実行環境は設定しないかぎり Hermes が求める最低 64K を下回る既定値のことがよくあります
- **長い応答の生成速度** — 長文の生成では、CPU だけのローカル環境よりクラウドでの推論のほうが速くなります

いちばん割のいい使い方は、日常の作業はローカルで済ませ、難しいものだけクラウドのフォールバックに任せることです。
