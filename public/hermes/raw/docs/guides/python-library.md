---
title: "Hermes を Python ライブラリとして使う"
description: "AIAgent を自作の Python スクリプト・Web アプリ・自動化パイプラインに組み込む方法。CLI は不要です"
upstream_path: guides/python-library.md
upstream_blob: 1fb0387400e1c6541db395c7f0e4fabf7e23528b
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/python-library
---

# Hermes を Python ライブラリとして使う {#using-hermes-as-a-python-library}

Hermes は CLI ツールだけではありません。`AIAgent` を直接インポートして、自作の Python スクリプトや Web アプリケーション、自動化パイプラインの中からプログラム的に利用できます。このガイドではその手順を説明します。

---

## インストール {#installation}

Hermes をクローンして、サポートされている編集可能な開発環境を作ります。

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
uv sync
```

作ったアプリケーションは、そのチェックアウト先で `uv run python your_app.py` として実行します。Hermes は `requirements.txt` からインストールするための wheel やソース配布物を、サポート対象としては公開していません。

:::tip
CLI で使う環境変数は、ライブラリとして使う場合にも同じものが必要です。最低限 `OPENROUTER_API_KEY` を設定してください（プロバイダに直接つなぐ場合は `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`）。
:::

---

## 基本的な使い方 {#basic-usage}

いちばん簡単なのは `chat()` メソッドです。メッセージを渡すと、文字列が返ってきます。

```python
from run_agent import AIAgent

agent = AIAgent(
    model="anthropic/claude-sonnet-4.6",
    quiet_mode=True,
)
response = agent.chat("What is the capital of France?")
print(response)
```

`chat()` はツール呼び出しやリトライを含む会話ループを内部ですべて処理し、最終的なテキスト応答だけを返します。

:::warning
Hermes を自分のコードに組み込むときは、必ず `quiet_mode=True` を設定してください。これがないと、エージェントが CLI 用のスピナーや進捗表示などのターミナル出力を出し、アプリケーションの出力が読みにくくなります。
:::

---

## 会話を細かく制御する {#full-conversation-control}

会話をより細かく制御したい場合は、`run_conversation()` を直接呼びます。応答の全体・メッセージ履歴・メタデータを含む辞書が返ります。

```python
agent = AIAgent(
    model="anthropic/claude-sonnet-4.6",
    quiet_mode=True,
)

result = agent.run_conversation(
    user_message="Search for recent Python 3.13 features",
    task_id="my-task-1",
)

print(result["final_response"])
print(f"Messages exchanged: {len(result['messages'])}")
```

返ってくる辞書には次のものが入っています。
- **`final_response`** — エージェントの最終的なテキスト応答
- **`messages`** — メッセージ履歴の全体（system、user、assistant、ツール呼び出し）

（渡した `task_id` は VM の分離のためにエージェントのインスタンスへ保持されますが、戻り値の辞書には含まれません。）

その呼び出しに限って一時的なシステムプロンプトを差し替える、独自のシステムメッセージを渡すこともできます。

```python
result = agent.run_conversation(
    user_message="Explain quicksort",
    system_message="You are a computer science tutor. Use simple analogies.",
)
```

---

## ツールを設定する {#configuring-tools}

エージェントが使えるツールセットは、`enabled_toolsets` または `disabled_toolsets` で制御します。

```python
# Only enable web tools (browsing, search)
agent = AIAgent(
    model="anthropic/claude-sonnet-4.6",
    enabled_toolsets=["web"],
    quiet_mode=True,
)

# Enable everything except terminal access
agent = AIAgent(
    model="anthropic/claude-sonnet-4.6",
    disabled_toolsets=["terminal"],
    quiet_mode=True,
)
```

:::tip
最小限に絞り込んだエージェントを作りたいとき（調査用ボットで Web 検索だけ使わせる、など）は `enabled_toolsets` を使います。ほとんどの機能は使わせつつ特定のものだけ止めたいとき（共有環境でターミナルへのアクセスを禁じる、など）は `disabled_toolsets` を使います。
:::

---

## 複数ターンの会話 {#multi-turn-conversations}

メッセージ履歴を渡し直すことで、複数ターンにわたって会話の状態を保てます。

```python
agent = AIAgent(
    model="anthropic/claude-sonnet-4.6",
    quiet_mode=True,
)

# First turn
result1 = agent.run_conversation("My name is Alice")
history = result1["messages"]

# Second turn — agent remembers the context
result2 = agent.run_conversation(
    "What's my name?",
    conversation_history=history,
)
print(result2["final_response"])  # "Your name is Alice."
```

`conversation_history` パラメータには、前回の結果に含まれる `messages` のリストをそのまま渡せます。エージェントは内部でコピーを作るため、元のリストが書き換えられることはありません。

---

## トラジェクトリを保存する {#saving-trajectories}

トラジェクトリの保存を有効にすると、会話が ShareGPT 形式で記録されます。学習データの生成やデバッグに役立ちます。

```python
agent = AIAgent(
    model="anthropic/claude-sonnet-4.6",
    save_trajectories=True,
    quiet_mode=True,
)

agent.chat("Write a Python function to sort a list")
# Saves to trajectory_samples.jsonl in ShareGPT format
```

会話ごとに JSONL の 1 行として追記されるので、自動実行の結果からデータセットを集めるのが簡単です。

---

## 独自のシステムプロンプト {#custom-system-prompts}

`ephemeral_system_prompt` を使うと、エージェントの振る舞いを方向づけつつ、その内容はトラジェクトリのファイルには保存**されません**（学習データを汚さずに済みます）。

```python
agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    ephemeral_system_prompt="You are a SQL expert. Only answer database questions.",
    quiet_mode=True,
)

response = agent.chat("How do I write a JOIN query?")
print(response)
```

コードレビュー担当、ドキュメント執筆者、SQL アシスタントといった専門特化のエージェントを、同じ土台のツール群のまま作り分けるのに向いています。

---

## バッチ処理 {#batch-processing}

多数のプロンプトを並列で実行したい場合のために、Hermes には `batch_runner.py` が付属しています。複数の `AIAgent` インスタンスを、リソースを適切に分離しながら同時に動かします。

```bash
python batch_runner.py --input prompts.jsonl --output results.jsonl
```

プロンプトごとに専用の `task_id` と分離された環境が割り当てられます。独自のバッチ処理を組みたい場合は、`AIAgent` を直接使って書けます。

```python

from run_agent import AIAgent

prompts = [
    "Explain recursion",
    "What is a hash table?",
    "How does garbage collection work?",
]

def process_prompt(prompt):
    # Create a fresh agent per task for thread safety
    agent = AIAgent(
        model="anthropic/claude-sonnet-4",
        quiet_mode=True,
        skip_memory=True,
    )
    return agent.chat(prompt)

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(process_prompt, prompts))

for prompt, result in zip(prompts, results):
    print(f"Q: {prompt}\nA: {result}\n")
```

:::warning
スレッドやタスクごとに、必ず**新しい `AIAgent` のインスタンス**を作ってください。エージェントは内部状態（会話履歴、ツールのセッション、反復回数のカウンタ）を持っており、複数の処理で共有するとスレッドセーフになりません。
:::

---

## 組み込みの例 {#integration-examples}

### FastAPI のエンドポイント {#fastapi-endpoint}

```python
from fastapi import FastAPI
from pydantic import BaseModel
from run_agent import AIAgent

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    model: str = "anthropic/claude-sonnet-4"

@app.post("/chat")
async def chat(request: ChatRequest):
    agent = AIAgent(
        model=request.model,
        quiet_mode=True,
        skip_context_files=True,
        skip_memory=True,
    )
    response = agent.chat(request.message)
    return {"response": response}
```

### Discord ボット {#discord-bot}

```python

from run_agent import AIAgent

client = discord.Client(intents=discord.Intents.default())

@client.event
async def on_message(message):
    if message.author == client.user:
        return
    if message.content.startswith("!hermes "):
        query = message.content[8:]
        agent = AIAgent(
            model="anthropic/claude-sonnet-4",
            quiet_mode=True,
            skip_context_files=True,
            skip_memory=True,
            platform="discord",
        )
        response = agent.chat(query)
        await message.channel.send(response[:2000])

client.run("YOUR_DISCORD_TOKEN")
```

### CI/CD パイプラインの 1 ステップ {#cicd-pipeline-step}

```python
#!/usr/bin/env python3
"""CI step: auto-review a PR diff."""

from run_agent import AIAgent

diff = subprocess.check_output(["git", "diff", "main...HEAD"]).decode()

agent = AIAgent(
    model="anthropic/claude-sonnet-4",
    quiet_mode=True,
    skip_context_files=True,
    skip_memory=True,
    disabled_toolsets=["terminal", "browser"],
)

review = agent.chat(
    f"Review this PR diff for bugs, security issues, and style problems:\n\n{diff}"
)
print(review)
```

---

## 主なコンストラクタのパラメータ {#key-constructor-parameters}

| パラメータ | 型 | 既定値 | 説明 |
|-----------|------|---------|-------------|
| `model` | `str` | `""` | OpenRouter 形式のモデル名（既定は空。実行時に hermes の設定から解決されます） |
| `quiet_mode` | `bool` | `False` | CLI 向けの出力を抑える |
| `enabled_toolsets` | `List[str]` | `None` | 特定のツールセットだけを許可する |
| `disabled_toolsets` | `List[str]` | `None` | 特定のツールセットを禁止する |
| `save_trajectories` | `bool` | `False` | 会話を JSONL に保存する |
| `ephemeral_system_prompt` | `str` | `None` | 独自のシステムプロンプト（トラジェクトリには保存されません） |
| `max_iterations` | `int` | `500` | 1 回の会話でツールを呼び出せる最大回数 |
| `skip_context_files` | `bool` | `False` | AGENTS.md ファイルの読み込みをやめる |
| `skip_memory` | `bool` | `False` | 永続メモリの読み書きを無効にする |
| `api_key` | `str` | `None` | API キー（未指定なら環境変数を使います） |
| `base_url` | `str` | `None` | API エンドポイントの URL を差し替える |
| `platform` | `str` | `None` | プラットフォームの指定（`"discord"`、`"telegram"` など） |

---

## 注意点 {#important-notes}

:::tip
- 作業ディレクトリの `AGENTS.md` をシステムプロンプトに読み込ませたくない場合は、**`skip_context_files=True`** を設定します。
- **`skip_memory=True`** を設定すると、エージェントが永続メモリを読み書きしなくなります。状態を持たない API エンドポイントではこちらをおすすめします。
- `platform` パラメータ（`"discord"`、`"telegram"` など）を渡すと、プラットフォームごとの書式のヒントが加わり、エージェントが出力の体裁をそれに合わせます。
:::

:::warning
- **スレッドセーフティ**: スレッドやタスクごとに `AIAgent` を 1 つずつ作ってください。同時に走る処理でインスタンスを共有してはいけません。
- **リソースの後始末**: 会話が終わると、エージェントはターミナルのセッションやブラウザのインスタンスを自動で片付けます。長時間動き続けるプロセスで使う場合は、会話が正常に終わるようにしてください。
- **反復回数の上限**: 既定の `max_iterations=500` はかなり余裕のある値です。単純な質問応答の用途なら、暴走するツール呼び出しのループを防いでコストを抑えるために、`max_iterations=10` くらいまで下げることも検討してください。
:::
