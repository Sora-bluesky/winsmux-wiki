---
title: "委任と並行作業"
description: "サブエージェントへの委任をいつどう使うか。並行しての調査、コードレビュー、複数ファイルの作業の型"
upstream_path: guides/delegation-patterns.md
upstream_blob: 4713609873ee32dbaa6b8072c538ef3e648fbcce
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/delegation-patterns
---

# 委任と並行作業 {#delegation-parallel-work}

Hermes は、独立した子のエージェントを立ち上げて、作業を同時に進められます。サブエージェントはそれぞれ自分の会話、端末のセッション、ツール群を持ちます。戻ってくるのは最後のまとめだけで、途中のツール呼び出しが手元の文脈に入ってくることはありません。

機能の詳しい説明は [サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/) を参照してください。

---

## いつ委任するのか {#when-to-delegate}

**委任に向いているもの:**
- 考える量が多い作業（デバッグ、コードレビュー、調査のまとめ）
- 途中のデータで文脈があふれてしまう作業
- 互いに関係のない作業を並べて進めるとき（A と B を同時に調べる）
- こちらの思い込みを持ち込まずに、まっさらな状態から当たってほしい作業

**別の手段を使うほうがよいもの:**
- ツールを 1 回呼ぶだけ → そのままツールを使う
- 手順の間に判断を挟む、機械的な多段の作業 → `execute_code`
- 利用者とのやり取りが必要な作業 → サブエージェントは `clarify` を使えません
- ちょっとしたファイルの編集 → 自分で直接やる
- セッションを閉じてもプロセスを再起動しても続いていてほしい長い作業 → `cronjob_manage` か `terminal(background=True, notify_on_complete=True)`。最上位の委任は非同期ではありますが、あくまでそのプロセスの中の話です。

---

## 型: 並行しての調査 {#pattern-parallel-research}

3 つのテーマを同時に調べて、整理されたまとめを受け取ります。

```
Research these three topics in parallel:
1. Current state of WebAssembly outside the browser
2. RISC-V server chip adoption in 2025
3. Practical quantum computing applications

Focus on recent developments and key players.
```

裏側で Hermes は次のように呼び出しています。

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

3 つは同時に走ります。サブエージェントはそれぞれ独立に Web を調べ、まとめを返します。親のエージェントは、それらを 1 本の説明としてまとめ直します。

---

## 型: コードレビュー {#pattern-code-review}

先入観なしにコードへ当たれるよう、まっさらな文脈のサブエージェントにセキュリティのレビューを任せます。

```
Review the authentication module at src/auth/ for security issues.
Check for SQL injection, JWT validation problems, password handling,
and session management. Fix anything you find and run the tests.
```

肝心なのは `context` の欄です。サブエージェントに必要なものを、そこに全部書く必要があります。

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

:::warning 文脈が伝わらないという問題
サブエージェントは、こちらの会話について**まったく何も知りません**。完全にまっさらな状態から始まります。「さっき話していたバグを直して」と委任しても、サブエージェントにはどのバグのことか分かりません。ファイルの場所、エラーの文面、プロジェクトの構成、守ってほしい条件は、いつも明示的に渡してください。
:::

---

## 型: 案を比べる {#pattern-compare-alternatives}

同じ問題への複数のやり方を同時に評価して、いちばん良いものを選びます。

```
I need to add full-text search to our Django app. Evaluate three approaches
in parallel:
1. PostgreSQL tsvector (built-in)
2. Elasticsearch via django-elasticsearch-dsl
3. Meilisearch via meilisearch-python

For each: setup complexity, query capabilities, resource requirements,
and maintenance overhead. Compare them and recommend one.
```

サブエージェントは、それぞれ 1 つの案を独立に調べます。互いに隔てられているので、判断が混ざりません。どの評価も、それ自体の中身だけで立っています。親のエージェントは 3 つのまとめを受け取って、比較します。

---

## 型: 複数ファイルにまたがる書き直し {#pattern-multi-file-refactoring}

大きな書き直しを分けて、サブエージェントごとにコードの別の部分を担当させます。

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
サブエージェントはそれぞれ自分の端末のセッションを持ちます。編集するファイルが違っていれば、同じプロジェクトのディレクトリーで互いに邪魔せずに作業できます。2 つのサブエージェントが同じファイルに触りそうなときは、そのファイルだけは並行作業が終わってから自分で直してください。
:::

---

## 型: 集めてから分析する {#pattern-gather-then-analyze}

機械的なデータ集めには `execute_code` を使い、考える量の多い分析のほうを委任します。

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

with open(os.path.expanduser("~/.hermes/cache/scratch/ai-funding-data.json"), "w") as f:
    json.dump({"search_results": results, "extracted": content["results"]}, f)
print(f"Collected {len(results)} results, extracted {len(content['results'])} pages")
""")

# Step 2: Reasoning-heavy analysis (delegation is better here)
delegate_task(
    goal="Analyze AI funding data and write a market report",
    context="""Raw data at ~/.hermes/cache/scratch/ai-funding-data.json contains search results and
    extracted web pages about AI funding, acquisitions, and IPOs in Q1 2026.
    Write a structured market report: key deals, trends, notable players,
    and outlook. Focus on deals over $100M."""
)
```

これがいちばん無駄のない型になることがよくあります。10 回を超えるツールの呼び出しは `execute_code` が安く片付け、そのあと 1 回だけの重い思考を、きれいな文脈のサブエージェントが引き受けるという形です。

---

## 引き継がれるツールの範囲 {#inherited-tool-access}

サブエージェントは、親が有効にしているツール群を引き継ぎます。`delegate_task` にはモデルから指定できる `toolsets` のパラメーターが無いので、委任された側が親に無い機能を自分に与えることはできません。委任する作業に Web、端末、ファイルなどが必要なときは、会話を始める前に親のツールを設定しておいてください。なお Hermes は、`clarify`、`memory`、`send_message` のように子で使えないツールは取り除きます。子は、プログラムからツールを呼ぶための `execute_code` は持ったままです。

---

## 制約 {#constraints}

- **既定では 10 個まで同時に**: 1 回のまとまりで同時に動くサブエージェントは既定で 10 個です（config.yaml の `delegation.max_concurrent_children` で変えられます。上限は無く、下限が 1 です）
- **入れ子の委任は自分で有効にする**: 末端のサブエージェント（既定）は `delegate_task`、`clarify`、`memory`、`execute_code` を呼べません。取りまとめ役のサブエージェント（`role="orchestrator"`）は、さらに委任するための `delegate_task` を持ちますが、それは `delegation.max_spawn_depth` を既定の 1 より大きくしたときだけです（下限 1、上限なし）。残りの 3 つは塞がれたままです。全体で止めたいときは `delegation.orchestrator_enabled: false` にします。

### 同時実行数と深さの調整 {#tuning-concurrency-and-depth}

| 設定 | 既定値 | 範囲 | 効果 |
|--------|---------|-------|--------|
| `max_concurrent_children` | 10 | >=1 | `delegate_task` 1 回あたりに同時に動かす数 |
| `max_spawn_depth` | 1 | >=1 | 何段目までがさらに子を立ち上げられるか |

例として、入れ子のサブエージェントを使って 30 個を同時に動かす設定は次のようになります。

```yaml
delegation:
  max_concurrent_children: 30
  max_spawn_depth: 2
```

- **端末は別々** — サブエージェントはそれぞれ、作業ディレクトリーも状態も別の端末のセッションを持ちます
- **会話の履歴は渡らない** — サブエージェントに見えるのは、親が `delegate_task` を呼ぶときに渡した `goal` と `context` だけです
- **既定では 250 回まで繰り返す** — 単純な作業をたくさん走らせるときは、`config.yaml` の `delegation.max_iterations` を小さくすると費用を抑えられます
- **やり通す保証はない** — 最上位の委任は裏で走り、あとから結果を返しますが、呼び出したセッションと Hermes のプロセスに結び付いたままです。セッションを閉じる、`/stop`、`/new`、プロセスの再起動のいずれかで、途中の作業が取り消されたり宙に浮いたりします。それらをまたいで残ってほしい作業には `cronjob_manage` か `terminal(background=True, notify_on_complete=True)` を使ってください。

---

## コツ {#tips}

**目標は具体的に。** 「バグを直して」では曖昧すぎます。「api/handlers.py の 47 行目で、parse_body() が None を返すために process_request() が TypeError になっているのを直して」なら、サブエージェントは動けます。

**ファイルの場所を書く。** サブエージェントはプロジェクトの構成を知りません。関係するファイルの絶対パス、プロジェクトのルート、テストのコマンドは必ず入れてください。

**文脈を切り離すために委任する。** まっさらな視点がほしいときがあります。委任すると、問題を自分の言葉ではっきり書き出すことになりますし、サブエージェントは会話の中で積み上がった思い込み抜きでその問題に当たれます。

**結果を確かめる。** サブエージェントのまとめは、あくまでまとめです。「バグを直してテストも通りました」と言われたら、自分でテストを走らせるか差分を読んで確かめてください。

**失敗はちゃんと表に出ます。** サブエージェントが落ちた場合（プロバイダーのエラー、時間切れ、異常終了）は、`⚠️ Subagent failed — "your goal": <reason>` という 1 行の短い知らせが、CLI の委任のツリーに出ます。メッセージのサービスにつないでいる場合は会話への通知として出ます。ツールの進み具合の表示を切っていても出ます。親のエージェントには、ツールの結果としてエラーの全文も届きます。

---

*委任の説明の全文（すべてのパラメーター、ACP との連携、細かい設定）は [サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/) を参照してください。*
