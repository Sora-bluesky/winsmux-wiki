---
title: "委任と並行作業"
description: "サブエージェントへの委任をいつ、どう使うか — 並行して調べる、コードを見てもらう、複数ファイルにまたがる作業を分ける、その型をまとめます"
upstream_path: guides/delegation-patterns.md
upstream_blob: 9f16bb34999f2dbf04b83721be0c85a16bec7301
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/delegation-patterns
---

# 委任と並行作業 {#delegation-parallel-work}

Hermes は、切り離された子エージェントを立ち上げて、複数の作業を同時に進められます。サブエージェントはそれぞれ自分の会話、ターミナルのセッション、道具立てを持ちます。戻ってくるのは最後のまとめだけで、途中のツール呼び出しがあなたのコンテキストに入り込むことはありません。

機能そのものの詳しい説明は [サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/) をご覧ください。

---

## 委任するとき {#when-to-delegate}

**委任に向いているもの:**
- 考える量が多い作業（デバッグ、コードのレビュー、調べたことの統合）
- 途中のデータでコンテキストが溢れてしまう作業
- 互いに独立していて並行して進められる仕事（A と B を同時に調べる）
- まっさらな状態から取りかかってほしい、先入観を持たせたくない作業

**別の手段を使うもの:**
- ツールを 1 回呼ぶだけ → そのままツールを使えば済みます
- 手順の間に判断をはさむ機械的な多段作業 → `execute_code`
- ユーザーとのやりとりが要る作業 → サブエージェントは `clarify` を使えません
- ちょっとしたファイルの編集 → 自分で直したほうが早いです
- セッションを閉じてもプロセスを再起動しても続いてほしい息の長い作業 → `cronjob` か `terminal(background=True, notify_on_complete=True)`。トップレベルの委任は非同期ではありますが、あくまで同じプロセスの中で動いています。

---

## 型: 並行して調べる {#pattern-parallel-research}

3 つのテーマを同時に調べて、整理されたまとめを受け取ります。

```
Research these three topics in parallel:
1. Current state of WebAssembly outside the browser
2. RISC-V server chip adoption in 2025
3. Practical quantum computing applications

Focus on recent developments and key players.
```

裏側で Hermes はこう動いています。

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

3 つは同時に走ります。それぞれのサブエージェントが自分で Web を検索し、まとめを返します。親のエージェントが、それらを筋の通ったブリーフィングに組み上げます。

---

## 型: コードのレビュー {#pattern-code-review}

まっさらなコンテキストのサブエージェントにセキュリティのレビューを任せると、思い込みなしにコードへ向かってくれます。

```
Review the authentication module at src/auth/ for security issues.
Check for SQL injection, JWT validation problems, password handling,
and session management. Fix anything you find and run the tests.
```

肝心なのは `context` の欄です。サブエージェントに必要なものは、すべてここに書いておく必要があります。

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

:::warning コンテキストという落とし穴
サブエージェントは、あなたの会話について**まったく何も知りません**。完全にゼロから始まります。「さっき話していたバグを直して」と委任しても、どのバグのことか見当もつきません。ファイルのパス、エラーの文言、プロジェクトの構成、守ってほしい条件は、必ず明示して渡してください。
:::

---

## 型: 選択肢を比べる {#pattern-compare-alternatives}

同じ問題に対する複数のやり方を並行して調べ、いちばん良いものを選びます。

```
I need to add full-text search to our Django app. Evaluate three approaches
in parallel:
1. PostgreSQL tsvector (built-in)
2. Elasticsearch via django-elasticsearch-dsl
3. Meilisearch via meilisearch-python

For each: setup complexity, query capabilities, resource requirements,
and maintenance overhead. Compare them and recommend one.
```

それぞれのサブエージェントが 1 つの選択肢を独立して調べます。互いに切り離されているので、評価が混ざり合うことがありません。どれもそれ自体の中身で評価されます。親のエージェントは 3 つのまとめを受け取って、比較を行います。

---

## 型: 複数ファイルのリファクタリング {#pattern-multi-file-refactoring}

大きなリファクタリングを分割し、コードベースの別々の部分をそれぞれのサブエージェントに任せます。

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
サブエージェントはそれぞれ自分のターミナルのセッションを持ちます。編集するファイルが違っていれば、同じプロジェクトのディレクトリで作業しても互いの邪魔になりません。同じファイルに触れそうな組み合わせがあるなら、そのファイルは並行作業が終わったあとに自分で手を入れてください。
:::

---

## 型: 集めてから読み解く {#pattern-gather-then-analyze}

機械的なデータ集めは `execute_code` に任せ、考える量の多い分析だけを委任します。

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

これがいちばん無駄のない型になることが多いです。10 回を超えるツールの呼び出しは `execute_code` が安く順番にこなし、そのうえで高くつく分析の一手だけを、きれいなコンテキストのサブエージェントが引き受けます。

---

## 引き継がれるツールの範囲 {#inherited-tool-access}

サブエージェントは、親で有効になっているツールの組をそのまま引き継ぎます。`delegate_task` にはモデルから指定できる `toolsets` の引数がないので、委任された側が親の持っていない能力を自分に足すことはできません。委任する作業に Web、ターミナル、ファイルなどへのアクセスが必要なら、会話を始める前に親のツールを設定しておいてください。なお Hermes は、子で使えないツール（`clarify`、`memory`、`send_message` など）は取り除きます。プログラムからツールを呼ぶための `execute_code` は子でも使えます。

---

## 制約 {#constraints}

- **並行は既定で 3 件**: ひとまとまりの委任は既定で 3 つのサブエージェントを同時に動かします（config.yaml の `delegation.max_concurrent_children` で変えられます。上限はなく、下限が 1 です）
- **入れ子の委任は明示的に有効化する**: 末端のサブエージェント（既定）は `delegate_task`、`clarify`、`memory`、`execute_code` を呼べません。まとめ役のサブエージェント（`role="orchestrator"`）はさらに委任するための `delegate_task` を持ち続けますが、それが効くのは `delegation.max_spawn_depth` を既定の 1 より上げたときだけです（下限 1、上限なし）。残りの 3 つは引き続き使えません。全体で止めるには `delegation.orchestrator_enabled: false` を指定します。

### 並行数と深さを調整する {#tuning-concurrency-and-depth}

| 設定 | 既定 | 範囲 | 効果 |
|--------|---------|-------|--------|
| `max_concurrent_children` | 3 | >=1 | `delegate_task` 1 回あたりの並行数 |
| `max_spawn_depth` | 1 | >=1 | さらに子を作れる委任の段数 |

例として、入れ子のサブエージェントを使って 30 並列で動かす場合はこうなります。

```yaml
delegation:
  max_concurrent_children: 30
  max_spawn_depth: 2
```

- **ターミナルは別々** — サブエージェントはそれぞれ自分のターミナルのセッションを持ち、作業ディレクトリも状態も分かれています
- **会話の履歴はない** — サブエージェントに見えるのは、親のエージェントが `delegate_task` を呼ぶときに渡した `goal` と `context` だけです
- **繰り返しは既定で 50 回** — 単純な作業では `max_iterations` を小さくすると費用を抑えられます
- **残り続ける仕組みではない** — トップレベルの委任は裏で動いて、あとから結果を返してきますが、それを抱えているセッションと Hermes のプロセスに結びついたままです。セッションを閉じる、`/stop`、`/new`、プロセスの再起動によって、進行中の作業が取り消されたり宙に浮いたりすることがあります。そうした区切りをまたいで続いてほしい作業には `cronjob` か `terminal(background=True, notify_on_complete=True)` を使ってください。

---

## コツ {#tips}

**目的は具体的に。**「バグを直して」では漠然としすぎです。「api/handlers.py の 47 行目で parse_body() が None を返し process_request() が TypeError になっているのを直して」なら、サブエージェントは十分に動けます。

**ファイルのパスを入れる。** サブエージェントはあなたのプロジェクトの構成を知りません。関係するファイルの絶対パス、プロジェクトの起点、テストのコマンドを、必ず添えてください。

**コンテキストを切り離すために委任する。** まっさらな視点がほしいときがあります。委任しようとすると問題をはっきり言葉にせざるを得ませんし、サブエージェントは会話の中で積み上がった前提を持たずに向き合ってくれます。

**結果を確かめる。** サブエージェントが返すのはあくまでまとめです。「バグを直してテストも通りました」と言われたら、自分でテストを走らせるか、差分を読んで確かめてください。

---

*委任のすべて — 引数の一覧、ACP との連携、進んだ設定 — は [サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/) をご覧ください。*
