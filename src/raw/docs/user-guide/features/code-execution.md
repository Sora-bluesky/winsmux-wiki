---
title: "コードの実行"
description: "RPC でツールを呼べる Python の実行環境。何手もかかる作業を1ターンに畳み込みます"
upstream_path: user-guide/features/code-execution.md
upstream_blob: 1585f415a24f5636bfae7288d2970c0819d1ccb3
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/code-execution
---

# コードの実行（プログラムからのツール呼び出し） {#code-execution-programmatic-tool-calling}

`execute_code` ツールを使うと、エージェントは Hermes のツールをプログラムから呼ぶ Python の台本を書けます。何手もかかる作業が、LLM の1ターンに畳み込まれます。台本はエージェントが動いている端末の子プロセスで走り、Unix ドメインソケット越しの RPC で Hermes とやり取りします。

## どう動くか {#how-it-works}

1. エージェントが `from hermes_tools import ...` を使う Python の台本を書きます
2. Hermes が RPC の関数を並べた `hermes_tools.py` の受け口モジュールを作ります
3. Hermes が Unix ドメインソケットを開き、RPC を待ち受けるスレッドを始めます
4. 台本は子プロセスで走り、ツールの呼び出しはソケットを通って Hermes に戻ります
5. LLM に返るのは台本の `print()` の出力だけです。途中のツールの結果が文脈の窓に入ることはありません

```python
# The agent can write scripts like:
from hermes_tools import web_search, web_extract

results = web_search("Python 3.13 features", limit=5)
for r in results["data"]["web"]:
    content = web_extract([r["url"]])
    # ... filter and process ...
print(summary)
```

**台本の中で使えるツール:** `web_search`、`web_extract`、`read_file`、`write_file`、`search_files`、`patch`、`terminal`（前面での実行のみ）。

## エージェントがこれを使う場面 {#when-the-agent-uses-this}

エージェントが `execute_code` を選ぶのは、次のようなときです。

- **3回以上のツールの呼び出し**があり、その間に処理の判断が挟まる
- まとまったデータのふるい分けや、条件による枝分かれがある
- 結果に対して繰り返しがある

いちばんの利点は、途中のツールの結果が文脈の窓に入らないことです。戻ってくるのは最後の `print()` の出力だけなので、トークンの使用量が大きく減ります。

## 実際の例 {#practical-examples}

### データを流して処理する {#data-processing-pipeline}

```python
from hermes_tools import search_files, read_file

# Find all config files and extract database settings
matches = search_files("database", path=".", file_glob="*.yaml", limit=20)
configs = []
for match in matches.get("matches", []):
    content = read_file(match["path"])
    configs.append({"file": match["path"], "preview": content["content"][:200]})

print(json.dumps(configs, indent=2))
```

### 何段階かに分けた Web の調べもの {#multi-step-web-research}

```python
from hermes_tools import web_search, web_extract

# Search, extract, and summarize in one turn
results = web_search("Rust async runtime comparison 2025", limit=5)
summaries = []
for r in results["data"]["web"]:
    page = web_extract([r["url"]])
    for p in page.get("results", []):
        if p.get("content"):
            summaries.append({
                "title": r["title"],
                "url": r["url"],
                "excerpt": p["content"][:500]
            })

print(json.dumps(summaries, indent=2))
```

### たくさんのファイルをまとめて書き換える {#bulk-file-refactoring}

```python
from hermes_tools import search_files, read_file, patch

# Find all Python files using deprecated API and fix them
matches = search_files("old_api_call", path="src/", file_glob="*.py")
fixed = 0
for match in matches.get("matches", []):
    result = patch(
        path=match["path"],
        old_string="old_api_call(",
        new_string="new_api_call(",
        replace_all=True
    )
    if "error" not in str(result):
        fixed += 1

print(f"Fixed {fixed} files out of {len(matches.get('matches', []))} matches")
```

### ビルドとテストを流す {#build-and-test-pipeline}

```python
from hermes_tools import terminal, read_file

# Run tests, parse results, and report
result = terminal("cd /project && python -m pytest --tb=short -q 2>&1", timeout=120)
output = result.get("output", "")

# Parse test output
passed = output.count(" passed")
failed = output.count(" failed")
errors = output.count(" error")

report = {
    "passed": passed,
    "failed": failed,
    "errors": errors,
    "exit_code": result.get("exit_code", -1),
    "summary": output[-500:] if len(output) > 500 else output
}

print(json.dumps(report, indent=2))
```

## 実行のしかた {#execution-mode}

`execute_code` には2つの実行のしかたがあり、`~/.hermes/config.yaml` の `code_execution.mode` で切り替えます。

| しかた | 作業ディレクトリ | Python の実行系 |
|------|-------------------|--------------------|
| **`project`**（既定） | そのセッションの作業ディレクトリ（`terminal()` と同じ） | 有効になっている `VIRTUAL_ENV` / `CONDA_PREFIX` の python。なければ Hermes 自身の python |
| `strict` | 利用者のプロジェクトから切り離した一時の置き場 | `sys.executable`（Hermes 自身の python） |

**`project` のままにしておくのがよい場合:** `import pandas`、`from my_project import foo`、`open(".env")` のような相対パスを、`terminal()` と同じように働かせたいときです。ほとんどの場合はこちらが望みどおりです。

**`strict` に切り替えるとよい場合:** 再現性を最優先したいときです。利用者がどの仮想環境を有効にしていても毎回同じ実行系を使いたい、台本をプロジェクトの木から隔離したい（相対パスでうっかりプロジェクトのファイルを読む恐れをなくしたい）という場合が当てはまります。

```yaml
# ~/.hermes/config.yaml
code_execution:
  mode: project   # or "strict"
```

`project` のときの逃げ道はこうです。`VIRTUAL_ENV` / `CONDA_PREFIX` が設定されていない、壊れている、あるいは 3.8 より古い Python を指している場合、解決役はきれいに `sys.executable` へ落ちます。エージェントが実行系のないまま取り残されることはありません。

安全に関わる決まりごとは、どちらのしかたでもまったく同じです。

- 環境の洗い落とし（API のキー、トークン、認証情報を取り除きます）
- ツールの許可名簿（台本から `execute_code` を入れ子で呼ぶことも、`delegate_task` や MCP のツールを呼ぶこともできません）
- 資源の上限（制限時間、標準出力の上限、ツールの呼び出し回数の上限）

しかたを切り替えて変わるのは、台本がどこで走り、どの実行系が走らせるかであって、どの認証情報が見えるかでも、どのツールを呼べるかでもありません。

## 資源の上限 {#resource-limits}

| 資源 | 上限 | 補足 |
|----------|-------|-------|
| **制限時間** | 5分（300秒） | 台本は SIGTERM で止められ、5秒の猶予のあと SIGKILL されます |
| **標準出力** | 50 KB | `[output truncated at 50KB]` の断りとともに切られます |
| **標準エラー** | 10 KB | 終了コードが0でないとき、原因を追えるよう出力に含まれます |
| **ツールの呼び出し** | 1回の実行につき50回 | 上限に達するとエラーが返ります |

上限はすべて `config.yaml` で変えられます。

```yaml
# In ~/.hermes/config.yaml
code_execution:
  mode: project      # project (default) | strict
  timeout: 300       # Max seconds per script (default: 300)
  max_tool_calls: 50 # Max tool calls per execution (default: 50)
```

## 台本の中でツールの呼び出しがどう働くか {#how-tool-calls-work-inside-scripts}

台本が `web_search("query")` のような関数を呼ぶと、こうなります。

1. 呼び出しが JSON に直され、Unix ドメインソケット越しに親プロセスへ送られます
2. 親がいつもの `handle_function_call` の受け口を通して振り分けます
3. 結果がソケットで送り返されます
4. 関数が、読み解かれた結果を返します

つまり台本の中のツールの呼び出しは、普通のツールの呼び出しとまったく同じように振る舞います。同じ回数制限、同じエラーの扱い、同じできることです。唯一の制約は、`terminal()` が前面での実行に限られること（`background` や `pty` の引数は使えません）です。

## エラーの扱い {#error-handling}

台本が失敗したとき、エージェントには筋道立ったエラーの情報が返ります。

- **終了コードが0でない**: 標準エラーが出力に含まれるので、エージェントは追跡の記録をすべて見られます
- **時間切れ**: 台本は止められ、エージェントには `"Script timed out after 300s and was killed."` が見えます
- **割り込み**: 実行中に利用者が新しいメッセージを送ると台本は終了させられ、エージェントには `[execution interrupted — user sent a new message]` が見えます
- **ツールの呼び出しの上限**: 50回の上限に達すると、それ以降の呼び出しにはエラーのメッセージが返ります

応答には必ず `status`（success/error/timeout/interrupted）、`output`、`tool_calls_made`、`duration_seconds` が含まれます。

## 安全のしくみ {#security}

:::danger 安全の考え方
子プロセスは**最小限の環境**で走ります。API のキー、トークン、認証情報は既定で取り除かれます。台本はもっぱら RPC の経路からツールを使い、明示的に許さない限り環境変数から秘密の情報を読むことはできません。
:::

名前に `KEY`、`TOKEN`、`SECRET`、`PASSWORD`、`CREDENTIAL`、`PASSWD`、`AUTH` を含む環境変数は除かれます。渡されるのは安全な系統の変数（`PATH`、`HOME`、`LANG`、`SHELL`、`PYTHONPATH`、`VIRTUAL_ENV` など）だけです。

### スキルが宣言した環境変数の受け渡し {#skill-environment-variable-passthrough}

スキルが自分の frontmatter に `required_environment_variables` を書いていると、そのスキルが読み込まれたあと、それらの変数は `execute_code` と `terminal` の子プロセスの両方へ**自動で渡されます**。任意のコードに対する守りを緩めないまま、スキルが宣言した API のキーを使えるようにする作りです。

スキル以外の用途では、`config.yaml` で変数を名指しして許せます。

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_KEY
    - ANOTHER_TOKEN
```

詳しくは[安全の手引き](/hermes/docs/user-guide/security/#environment-variable-passthrough)を参照してください。

### 子プロセスの中の `HERMES_*` 変数 {#hermes-variables-in-the-child}

子プロセスが受け取る運用向けの `HERMES_*`
変数は、名前を正確に指定した小さな決まった組だけです。

- `HERMES_HOME`
- `HERMES_PROFILE`
- `HERMES_CONFIG`
- `HERMES_ENV`

（このほかに `HERMES_RPC_DIR` / `HERMES_RPC_SOCKET` / `TZ` / `HOME` も入ります。RPC の経路が働くよう Hermes が
明示的に入れているものです。）

:::note 動きの変更
以前の版は、名前が `HERMES_` で始まる変数を**すべて**
子プロセスへ渡していました。この広い前置きによる指定は、安全を固めるために取り除かれました。秘密を思わせる文字列を含まない
`HERMES_*` という名前の設定（たとえば `HERMES_BASE_URL`、`HERMES_KANBAN_DB`、`HERMES_*_WEBHOOK` の
宛先など）が、隔離されたコードへ漏れうるからです。

`execute_code` の台本が — あるいはそれが読み込み時に取り込むリポジトリやプラグインのモジュールが —
上の4つの運用向けの名前に入らない `HERMES_*` 変数に頼っていた場合、子プロセスではその変数が
**設定されていない**状態になります。この取りやめは意図したもので、不具合ではありません。
:::

**回避策 — その変数を名指しで戻す。** どちらの道も、変数を
`execute_code` *と* `terminal` の子プロセスの両方へ渡し、どちらも秘密を取り除く
保証を緩めません（Hermes が管理する提供元の認証情報を、この方法で戻すことはできません）。

1. **端末ごとに `config.yaml` で** — 受け渡しの許可名簿に、
   変数の名前を正確に書き足します。

   ```yaml
   terminal:
     env_passthrough:
       - HERMES_KANBAN_DB
       - HERMES_BASE_URL
   ```

2. **スキルごとに、そのスキルの frontmatter で** — そう宣言しておくと、
   そのスキルが読み込まれるたびに自動で登録されます。

   ```yaml
   required_environment_variables:
     - HERMES_KANBAN_DB
   ```

**見分け方。** 許可名簿にない `HERMES_*` 変数が子プロセスで
落とされたとき、Hermes はその名前を挙げて `env_passthrough` という逃げ道を指す `debug` のログを1行出します。
デバッグの記録を有効にして（`hermes logs --level DEBUG`、または `~/.hermes/logs/agent.log` を確認）、
台本が `HERMES_*` の変数を見失っているように見えるときは
`execute_code: dropped N non-allowlisted HERMES_* var(s)` を探してください。

Hermes は台本と、自動で作られる `hermes_tools.py` の RPC の受け口を、必ず一時の置き場へ書き出し、実行が終わったら片づけます。`strict` では台本もそこで*走ります*。`project` ではセッションの作業ディレクトリで走ります（一時の置き場は `PYTHONPATH` に残るので、取り込みはそのまま解決できます）。子プロセスは自分専用のプロセスグループで走るので、時間切れや割り込みのときにきれいに止められます。

## execute_code と terminal {#executecode-vs-terminal}

| 使いどころ | execute_code | terminal |
|----------|-------------|----------|
| 途中にツールの呼び出しを挟む何段階かの作業 | ✅ | ❌ |
| ちょっとしたシェルのコマンド | ❌ | ✅ |
| 大きなツールの出力をふるい分け・加工する | ✅ | ❌ |
| ビルドやテスト一式を走らせる | ❌ | ✅ |
| 検索の結果を繰り返し処理する | ✅ | ❌ |
| 対話的な処理・裏で動かす処理 | ❌ | ✅ |
| 環境に API のキーが要る | ⚠️ [受け渡し](/hermes/docs/user-guide/security/#environment-variable-passthrough)を通した場合のみ | ✅（たいていは渡ります） |

**目安:** 呼び出しの間に判断を挟みながら Hermes のツールをプログラムから呼びたいときは `execute_code`。シェルのコマンド、ビルド、処理の実行には `terminal` を使います。

## 動く環境 {#platform-support}

コードの実行は **Linux、macOS、Windows** で使えます。Linux と macOS では RPC の経路に Unix ドメインソケットを使います。`AF_UNIX` が当てにならない Windows では、Hermes が自動でループバックの TCP ソケットに切り替えて、隔離された実行の RPC を運びます。離れた場所のターミナル（Docker／SSH／Modal など）ではファイルを使う RPC の経路になり、加えてその実行先に Python 3 が必要です。
