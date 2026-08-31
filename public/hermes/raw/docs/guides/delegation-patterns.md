---
title: "委任と並行作業"
description: "サブエージェントへの委任をいつ、どう使うか。並行した調査、コードレビュー、複数ファイルにまたがる作業の型"
upstream_path: guides/delegation-patterns.md
upstream_blob: d0f5bffb27d0f884820a419ce7659cbaa1b0c6da
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/delegation-patterns
---

# 委任と並行作業 {#delegation-parallel-work}

Hermes は隔離された子エージェントを立ち上げ、タスクを並行して進められます。サブエージェントはそれぞれ自分の会話、ターミナルのセッション、道具立てを持ちます。戻ってくるのは最終的な要約だけで、途中のツール呼び出しがコンテキストウィンドウに入ることはありません。

機能のひととおりの説明は [サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/) を見てください。

---

## どんなときに委任するか {#when-to-delegate}

**委任に向いているもの:**
- 推論の重い小タスク（デバッグ、コードレビュー、調査のまとめ）
- 途中のデータでコンテキストが溢れてしまうようなタスク
- 互いに独立した並行の作業（A と B を同時に調べる）
- まっさらな文脈で、先入観なしに取り組んでほしいタスク

**別の手段を使うべきもの:**
- ツールを 1 回呼ぶだけ → そのツールを直接使えば済みます
- 手順の間に判断が挟まる、機械的な多段の作業 → `execute_code`
- ユーザーとのやり取りが要るタスク → サブエージェントは `clarify` を使えません
- ちょっとしたファイルの編集 → 自分でやってしまいましょう
- セッションを閉じてもプロセスを再起動しても続いてほしい長時間の作業 → `cronjob` か `terminal(background=True, notify_on_complete=True)`。最上位の委任は非同期ですが、プロセスの中で完結します。

---

## 型: 並行した調査 {#pattern-parallel-research}

3 つのテーマを同時に調べ、整った要約を受け取ります。

```
Research these three topics in parallel:
1. Current state of WebAssembly outside the browser
2. RISC-V server chip adoption in 2025
3. Practical quantum computing applications

Focus on recent developments and key players.
```

裏側では、Hermes はこう動いています。

```python
delegate_task(tasks=[
    {
        "goal": "Research WebAssembly outside the browser in 2025",
        "context": "Focus on: runtimes (Wasmtime, Wasmer), cloud/edge use cases, WASI progress"
    },
    {
        "goal": "Research RISC-V server chip adoption",
        "context": "Focus on: server chips shipping, cloud providers adopting, software ecosystem"
    },
    {
        "goal": "Research practical quantum computing applications",
        "context": "Focus on: error correction breakthroughs, real-world use cases, key companies"
    }
])
```

3 つは同時に走ります。サブエージェントはそれぞれ独立して Web を検索し、要約を返します。親のエージェントはそれをひとつのまとまった報告に仕立てます。

---

## 型: コードレビュー {#pattern-code-review}

セキュリティのレビューを、まっさらな文脈のサブエージェントに任せて、思い込みなしにコードを見てもらいます。

```
Review the authentication module at src/auth/ for security issues.
Check for SQL injection, JWT validation problems, password handling,
and session management. Fix anything you find and run the tests.
```

肝心なのは `context` の欄です。サブエージェントに必要なものをすべて書いておく必要があります。

```python
delegate_task(
    goal="Review src/auth/ for security issues and fix any found",
    context="""Project at /home/user/webapp. Python 3.11, Flask, PyJWT, bcrypt.
    Auth files: src/auth/login.py, src/auth/jwt.py, src/auth/middleware.py
    Test command: pytest tests/auth/ -v
    Focus on: SQL injection, JWT validation, password hashing, session management.
    Fix issues found and verify tests pass."""
)
```

:::warning 文脈の落とし穴
サブエージェントは、こちらの会話について **まったく何も知りません**。完全にまっさらな状態から始まります。「さっき話していたバグを直して」と委任しても、サブエージェントにはどのバグのことか分かりません。ファイルのパス、エラーメッセージ、プロジェクトの構成、守ってほしい条件は、必ず明示的に渡してください。
:::

---

## 型: 選択肢を比べる {#pattern-compare-alternatives}

同じ問題に対する複数のやり方を並行して評価し、いちばん良いものを選びます。

```
I need to add full-text search to our Django app. Evaluate three approaches
in parallel:
1. PostgreSQL tsvector (built-in)
2. Elasticsearch via django-elasticsearch-dsl
3. Meilisearch via meilisearch-python

For each: setup complexity, query capabilities, resource requirements,
and maintenance overhead. Compare them and recommend one.
```

サブエージェントはそれぞれ 1 つの選択肢を独立して調べます。互いに隔離されているので、評価が混ざり合うことはなく、それぞれが単独で成り立ちます。親のエージェントは 3 つの要約を受け取って比較します。

---

## 型: 複数ファイルにまたがるリファクタリング {#pattern-multi-file-refactoring}

大きなリファクタリングを分割し、コードベースの別々の部分をサブエージェントに並行して任せます。

```python
delegate_task(tasks=[
    {
        "goal": "Refactor all API endpoint handlers to use the new response format",
        "context": """Project at /home/user/api-server.
        Files: src/handlers/users.py, src/handlers/auth.py, src/handlers/billing.py
        Old format: return {"data": result, "status": "ok"}
        New format: return APIResponse(data=result, status=200).to_dict()
        Import: from src.responses import APIResponse
        Run tests after: pytest tests/handlers/ -v"""
    },
    {
        "goal": "Update all client SDK methods to handle the new response format",
        "context": """Project at /home/user/api-server.
        Files: sdk/python/client.py, sdk/python/models.py
        Old parsing: result = response.json()["data"]
        New parsing: result = response.json()["data"] (same key, but add status code checking)
        Also update sdk/python/tests/test_client.py"""
    },
    {
        "goal": "Update API documentation to reflect the new response format",
        "context": """Project at /home/user/api-server.
        Docs at: docs/api/. Format: Markdown with code examples.
        Update all response examples from old format to new format.
        Add a 'Response Format' section to docs/api/overview.md explaining the schema."""
    }
])
```

:::tip
サブエージェントはそれぞれ自分のターミナルのセッションを持ちます。編集するファイルが違っていれば、同じプロジェクトのディレクトリで互いの邪魔をせずに作業できます。2 つのサブエージェントが同じファイルに触れそうなときは、そのファイルだけは並行作業が終わったあとに自分で手当てしてください。
:::

---

## 型: 集めてから分析する {#pattern-gather-then-analyze}

機械的なデータ集めには `execute_code` を使い、推論の重い分析だけを委任します。

```python
# Step 1: Mechanical gathering (execute_code is better here — no reasoning needed)
execute_code("""
from hermes_tools import web_search, web_extract

results = []
for query in ["AI funding Q1 2026", "AI startup acquisitions 2026", "AI IPOs 2026"]:
    r = web_search(query, limit=5)
    for item in r["data"]["web"]:
        results.append({"title": item["title"], "url": item["url"], "desc": item["description"]})

# Extract full content from top 5 most relevant
urls = [r["url"] for r in results[:5]]
content = web_extract(urls)

# Save for the analysis step

with open("/tmp/ai-funding-data.json", "w") as f:
    json.dump({"search_results": results, "extracted": content["results"]}, f)
print(f"Collected {len(results)} results, extracted {len(content['results'])} pages")
""")

# Step 2: Reasoning-heavy analysis (delegation is better here)
delegate_task(
    goal="Analyze AI funding data and write a market report",
    context="""Raw data at /tmp/ai-funding-data.json contains search results and
    extracted web pages about AI funding, acquisitions, and IPOs in Q1 2026.
    Write a structured market report: key deals, trends, notable players,
    and outlook. Focus on deals over $100M."""
)
```

これがいちばん無駄のない型になることが多いです。10 回を超える順番どおりのツール呼び出しを `execute_code` が安く片づけ、そのうえで高価な推論のタスクを、きれいな文脈のサブエージェントに 1 回だけ任せます。

---

## 引き継がれるツールの権限 {#inherited-tool-access}

サブエージェントは、親が有効にしているツールセットを引き継ぎます。`delegate_task` にはモデルから見える `toolsets` の引数がないので、委任した作業が親の持っていない権限を自分に与えることはできません。委任するタスクに Web、ターミナル、ファイルなどの権限が要るなら、会話を始める前に親側のツールを設定しておいてください。なお Hermes は、`clarify`、`memory`、`send_message` のように子で使えないツールを引き続き取り除きます。子は、プログラムからツールを呼ぶための `execute_code` は持ったままです。

---

## 制限 {#constraints}

- **並行は既定で 3 タスク**: 一度に動くサブエージェントは既定で 3 つです（config.yaml の `delegation.max_concurrent_children` で変えられます。上限はなく、下限が 1 です）
- **入れ子の委任は自分で有効にします**: 末端のサブエージェント（既定）は `delegate_task`、`clarify`、`memory`、`execute_code` を呼べません。まとめ役のサブエージェント（`role="orchestrator"`）はさらに委任するために `delegate_task` を持ち続けますが、これは `delegation.max_spawn_depth` を既定の 1 より大きくした場合だけです（下限は 1、上限はありません）。残りの 3 つは引き続き使えません。全体で無効にしたいときは `delegation.orchestrator_enabled: false` にします。

### 並行数と深さを調整する {#tuning-concurrency-and-depth}

| 設定 | 既定 | 範囲 | 効果 |
|--------|---------|-------|--------|
| `max_concurrent_children` | 3 | >=1 | `delegate_task` の呼び出し 1 回あたりの並行数 |
| `max_spawn_depth` | 1 | >=1 | 何段目の委任までさらに子を立ち上げられるか |

例として、入れ子のサブエージェントを使って 30 個の作業を並行して動かす場合はこうします。

```yaml
delegation:
  max_concurrent_children: 30
  max_spawn_depth: 2
```

- **ターミナルは別々** — サブエージェントはそれぞれ自分のターミナルのセッションを持ち、作業ディレクトリも状態も分かれています
- **会話の履歴はありません** — サブエージェントに見えるのは、親のエージェントが `delegate_task` を呼ぶときに渡した `goal` と `context` だけです
- **繰り返しは既定で 50 回** — 単純なタスクでは `max_iterations` を小さくすると費用を抑えられます
- **消えないわけではありません** — 最上位の委任はバックグラウンドで動き、あとから結果を返しますが、依頼元のセッションと Hermes のプロセスに紐づいたままです。セッションを閉じたり、`/stop` や `/new` を打ったり、プロセスを再起動したりすると、進行中の作業が取り消されたり宙に浮いたりすることがあります。そうした区切りを越えて続いてほしい作業には `cronjob` か `terminal(background=True, notify_on_complete=True)` を使ってください。

---

## こつ {#tips}

**目標は具体的に書きます。** 「バグを直して」では曖昧すぎます。「api/handlers.py の 47 行目で、parse_body() が None を返して process_request() が TypeError になっているのを直して」と書けば、サブエージェントが動くのに十分な材料になります。

**ファイルのパスを入れます。** サブエージェントはプロジェクトの構成を知りません。関係するファイルの絶対パス、プロジェクトの起点、テストのコマンドは必ず書いてください。

**文脈を切り離すために委任します。** 新しい視点がほしいときがあります。委任すると問題を自分の言葉で言い直すことになりますし、サブエージェントは会話の中で積み上がった前提を持たずに取り組んでくれます。

**結果を確かめます。** サブエージェントの要約は、あくまで要約です。「バグを直してテストも通りました」と言われたら、自分でテストを走らせるか、差分を読んで確かめてください。

**失敗はちゃんと表に出ます。** 落ちたサブエージェント（プロバイダのエラー、タイムアウト、クラッシュ）は、CLI の委任のツリーでは 1 行の短い通知 — `⚠️ Subagent failed — "your goal": <reason>` — として、ゲートウェイのプラットフォームではチャットの通知として報告されます。ツールの進捗表示を切っていても出ます。親のエージェントには、ツールの結果としてエラーの全文も届きます。

---

*委任について、すべての引数、ACP との連携、踏み込んだ設定まで含めた一覧は [サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/) を見てください。*
