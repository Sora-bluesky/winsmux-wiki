---
title: "Openhands — OpenHands CLI にコーディングを任せる（モデルを選ばない、LiteLLM）"
description: "OpenHands CLI にコーディングを任せる（モデルを選ばない、LiteLLM）"
upstream_path: user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-openhands.md
upstream_blob: 9774fe25b0279e1ddda5b76dc87689310ad49d90
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-openhands
---

# Openhands {#openhands}

OpenHands CLI にコーディングを任せます（モデルを選ばない、LiteLLM）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/autonomous-ai-agents/openhands` で入れます |
| パス | `optional-skills/autonomous-ai-agents/openhands` |
| バージョン | `0.1.0` |
| 作者 | Tim Koepsel (xzessmedia), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `Coding-Agent`, `OpenHands`, `Model-Agnostic`, `LiteLLM` |
| 関連 skill | [`claude-code`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code/), [`codex`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex/), [`opencode`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-opencode/), [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# OpenHands CLI {#openhands-cli}

`terminal` ツール経由で、[OpenHands CLI](https://github.com/All-Hands-AI/OpenHands) にコーディングを任せます。OpenHands はモデルを選びません。LiteLLM が対応している提供元ならどれでも使えます（OpenAI、Anthropic、OpenRouter、DeepSeek、Ollama、vLLM など）。

この skill は、まとめて処理する用・一回で終わる用の、ヘッドレスモードのための包みです。対話型の画面は Hermes からは使いません。

## こんなときに使います {#when-to-use}

- コーディングの作業を、ほかでもない OpenHands に任せたいとき。
- Anthropic でも OpenAI でもない提供元（DeepSeek、Qwen、Ollama、vLLM、Nous など）で動くコーディングエージェントがほしいとき — 兄弟にあたる `claude-code` と `codex` は特定の一社に結びついています。
- ワークスペースの中で、複数の手順にわたるファイル編集とシェルコマンドを実行したいとき。

Claude に寄せるなら `claude-code`、OpenAI に寄せるなら `codex` を選んでください。Hermes 自身のサブエージェントを使うなら `delegate_task` です。

## 事前に必要なもの {#prerequisites}

1. 本家をインストールします（Python 3.12 以上と `uv` が必要です）。

   ```
   terminal(command="uv tool install openhands --python 3.12")
   ```

   確認: `openhands --version`（この文書を書いた時点では `OpenHands CLI 1.16.0` / `SDK v1.21.0` です）。

2. モデルを選び、`--override-with-envs` で使う環境変数を設定します。

   ```
   export LLM_MODEL=openrouter/openai/gpt-4o-mini       # or any LiteLLM slug
   export LLM_API_KEY=$OPENROUTER_API_KEY
   export LLM_BASE_URL=https://openrouter.ai/api/v1     # omit for native OpenAI
   ```

   `LLM_MODEL` には LiteLLM の完全な識別名を使います。提供元が OpenRouter のときは接頭辞が二重になり、`openrouter/<vendor>/<model>` の形になります（例: `openrouter/anthropic/claude-sonnet-4.5`）。Anthropic を直接使うなら `anthropic/claude-sonnet-4-5`、OpenAI を直接使うなら `openai/gpt-4o-mini` です。

3. JSON の出力の前にアスキーアートが出ないよう、起動時のバナーを止めます。

   ```
   export OPENHANDS_SUPPRESS_BANNER=1
   ```

## 動かし方 {#how-to-run}

必ず `terminal` ツール経由で呼び出してください。自動実行では常に `--headless --json --override-with-envs --exit-without-confirmation` を渡します。

### 一回で終わる作業 {#one-shot-task}

```
terminal(
  command="OPENHANDS_SUPPRESS_BANNER=1 LLM_MODEL=openrouter/openai/gpt-4o-mini LLM_API_KEY=$OPENROUTER_API_KEY LLM_BASE_URL=https://openrouter.ai/api/v1 openhands --headless --json --override-with-envs --exit-without-confirmation -t 'Add error handling to all API calls in src/'",
  workdir="/path/to/project",
  timeout=600
)
```

### 長い作業はバックグラウンドで {#background-for-long-tasks}

```
terminal(command="<same as above>", workdir="/path/to/project", background=true, notify_on_complete=true)
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")
```

### 前の会話の続きから {#resume-a-previous-conversation}

OpenHands は実行の最後に `Conversation ID: <32-hex>` と、`Hint: openhands --resume <dashed-uuid>` という行を表示します。続きから始めるには、ハイフン入りのほうを使ってください。

```
terminal(
  command="OPENHANDS_SUPPRESS_BANNER=1 LLM_MODEL=... openhands --headless --json --override-with-envs --exit-without-confirmation --resume <dashed-uuid> -t 'Now fix the bug you found'",
  workdir="/path/to/project"
)
```

## 実在するフラグの一覧 {#real-flag-list}

`openhands --help`（CLI 1.16.0）で確認したものです。この表に無いものはフラグではありません。環境変数か設定ファイルで渡してください。

| フラグ | 効果 |
|------|------|
| `--headless` | 画面を出しません。`-t` か `-f` が必要です。すべての操作を自動で承認します（このモードに `--llm-approve` はありません）。 |
| `--json` | JSONL でイベントを流します（`--headless` が必要です）。 |
| `-t TEXT` | 作業の指示文。 |
| `-f PATH` | 作業の指示をファイルから読みます。 |
| `--resume [ID]` | 会話を再開します。ID を省くと直近のものを一覧します。 |
| `--last` | 直近のものを再開します（`--resume` と一緒に使います）。 |
| `--override-with-envs` | `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` の環境変数を適用します。これが無いと OpenHands は `~/.openhands/settings.json` を使い、環境変数を無視します。 |
| `--exit-without-confirmation` | 終了時の「本当によいですか」の確認を出しません。 |
| `--always-approve` / `--yolo` | すべての操作を自動で承認します（`--headless` では既定です）。 |
| `--llm-approve` | LLM による安全性の関門（対話時のみ。ヘッドレスでは動きません）。 |
| `--version` / `-v` | バージョンを表示して終了します。 |

**`--model`、`--max-iterations`、`--workspace`、`--sandbox`、`--sandbox-type` というフラグはありません。** モデルは `LLM_MODEL` で指定します。ワークスペースは `terminal` ツールに渡す `workdir` です。サンドボックスや実行環境は `RUNTIME` と `SANDBOX_VOLUMES` の環境変数です。

## JSON イベントの構造 {#json-event-schema}

`--json --headless` を付けると、OpenHands は JSONL を出します。1 行につき JSON オブジェクトが一つで、それに加えて JSON ではない状態表示の行がいくつか混ざります（`Initializing agent...`、`Agent is working`、`Agent finished`、最後のまとめの枠、`Goodbye!`、`Conversation ID:`、`Hint:`）。`{` で始まる行だけを取り出してください。

先頭の `kind` フィールドでイベントの種類が分かります。

- `MessageEvent` — 利用者かエージェントのテキストのターンです。`source` は `user` か `agent` です。
- `ActionEvent` — エージェントがツールを選びました。`tool_name`（`file_editor`、`terminal`、`finish`）と `action.kind`（`FileEditorAction`、`TerminalAction`、`FinishAction`）を読みます。
- `ObservationEvent` — ツールの結果です。成否は `observation.is_error` で分かります。`source` は `environment` です。
- `ActionEvent` の中の `FinishAction` は、エージェントの最後のメッセージを `action.message` に持ちます。

CLI はまず LiteLLM や Authlib からの標準エラー出力をすべて表示します。つまずきやすいところを参照してください。標準出力だけを 1 行ずつ処理し、`{` で始まらない行は無視します。

## つまずきやすいところ {#pitfalls}

- **実行のたびに LiteLLM の警告が出ます。** `botocore` が入っていないため、CLI は `bedrock-runtime` と `sagemaker-runtime` の警告を標準エラー出力に出します。加えて Authlib の非推奨の警告も出ます。これらは雑音であって失敗ではありません。標準エラー出力を `/dev/null` に流すか、利用者に見せる前に取り除いてください。
- **バナーがうるさい。** `OPENHANDS_SUPPRESS_BANNER=1` が無いと、実行のたびに SDK を宣伝する複数行の `+--+` のアスキーアートの枠が出ます。必ず設定してください。
- **自動実行では `--override-with-envs` が必須です。** これが無いと OpenHands は `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` を無視し、`~/.openhands/settings.json` を見にいきます。入れたばかりの環境ではこのファイルが無く、CLI は初回設定の入力を待って止まります。
- **モデルの識別名は提供元のものではなく LiteLLM のものです。** `openrouter/openai/gpt-4o-mini` は通りますが、OpenRouter を指したまま `openai/gpt-4o-mini` と書いても通りません。`anthropic/claude-sonnet-4-5`（ハイフン）は Anthropic を直接、`openrouter/anthropic/claude-sonnet-4.5`（ドット）は OpenRouter 経由です。間違えると LiteLLM から分かりにくい 400 が返ります。
- **`pip install openhands-ai` は別のパッケージです。** それは古い V0 の SDK です。新しい CLI は `uv tool install openhands --python 3.12` で入れます。手入れされている conda のパッケージはありません。
- **再開に使う ID の形がややこしい。** CLI は最後に `Conversation ID: f46573d9cfdb45e492ca189bde40019b`（ハイフンなし）を出し、続けて `Hint: openhands --resume f46573d9-cfdb-45e4-92ca-189bde40019b`（ハイフンあり）を出します。ハイフンありのほうを使ってください。
- **ヘッドレスでは `--llm-approve` は無視されます。** 渡すと argparse のエラーになります。ヘッドレスでは常時承認が決め打ちです。
- **本家は Windows に対応していません。** OpenHands の文書では、Windows では WSL が必要とされています。この skill もそれに合わせて `[linux, macos]` に限定しています。
- **`~/.openhands/conversations/<id>/` が溜まります。** 実行のたびに経過が保存されます。まとめて回すときは片付けてください。
- **インストールが重い（およそ 200 パッケージ）。** 作業中のプロジェクトと依存関係がぶつからないよう、`uv tool install`（独立した仮想環境）を使ってください。

## 動作の確認 {#verification}

```
terminal(
  command="OPENHANDS_SUPPRESS_BANNER=1 LLM_MODEL=openrouter/openai/gpt-4o-mini LLM_API_KEY=$OPENROUTER_API_KEY LLM_BASE_URL=https://openrouter.ai/api/v1 openhands --headless --json --override-with-envs --exit-without-confirmation -t 'Print the string OPENHANDS_OK to stdout via the terminal tool.'",
  workdir="/tmp",
  timeout=120
)
```

JSONL の流れの最後が `FinishAction` で、その `action.message` に `OPENHANDS_OK` が入っていれば、インストールはうまくいっています。

## 関連 {#related}

- [OpenHands GitHub](https://github.com/All-Hands-AI/OpenHands)
- [OpenHands CLI のコマンド一覧](https://docs.openhands.dev/openhands/usage/cli/command-reference)
- 兄弟にあたる skill: `claude-code`（Anthropic のみ）、`codex`（OpenAI のみ）、`opencode`（OpenCode 経由で複数の提供元）、`hermes-agent`（`delegate_task` 経由の Hermes のサブエージェント）。
