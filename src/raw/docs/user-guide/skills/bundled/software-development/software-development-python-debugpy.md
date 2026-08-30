---
title: "Python Debugpy — Python のデバッグ: pdb の REPL と debugpy のリモート接続（DAP）"
description: "Python のデバッグ: pdb の REPL と debugpy のリモート接続（DAP）"
upstream_path: user-guide/skills/bundled/software-development/software-development-python-debugpy.md
upstream_blob: e6f1120e0835cac46386cb7033401d7f01a00dd4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-python-debugpy
---

# Python Debugpy {#python-debugpy}

Python のデバッグです。pdb の REPL と、debugpy のリモート接続（DAP）を使います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development\python-debugpy` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `debugging`, `python`, `pdb`, `debugpy`, `breakpoints`, `dap`, `post-mortem` |
| 関連 skill | [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/), [`node-inspect-debugger`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-node-inspect-debugger/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Python のデバッガ（pdb と debugpy） {#python-debugger-pdb-debugpy}

## 概要 {#overview}

道具は 3 つあり、状況で使い分けます。

| ツール | 使いどころ |
|---|---|
| **`breakpoint()` と pdb** | 手元で対話的に調べる、いちばん手軽なやり方です。ソースに `breakpoint()` を書いて普通に実行すると、その行で REPL が開きます。 |
| **`python -m pdb`** | 手元のスクリプトを、ソースを書き換えずに pdb の下で起動します。ちょっと覗きたいときに便利です。 |
| **`debugpy`** | リモート、画面なし、「すでに動いているプロセスに後から接続する」場合に使います。DAP でやり取りし、ターミナルからスクリプトで操作でき、長く動き続けるプロセス（gateway、デーモン、PTY の子プロセス）にも使えます。 |

**まずは `breakpoint()` から。** いちばん手間がかからず、それで済むことが多いからです。

## 使いどころ {#when-to-use}

- テストが失敗したが、traceback を見ても値がおかしい理由がわからない
- 関数を 1 行ずつ進めながら、コレクションが書き換わる様子を見たい
- 長く動き続けるプロセス（hermes gateway、tui_gateway）の挙動がおかしく、再起動もできない
- 事後解析。本番同然のコードで例外が出たので、落ちた場所のローカル変数を調べたい
- サブプロセスや子プロセス（Python の `_SlashWorker`、PTY のブリッジワーカー）そのものがバグの現場である

**使わなくてよい場面:** `print()` や `logging.debug` で 1 分もかからず片づくこと、`pytest -vv --tb=long --showlocals` ですでにわかることです。

## pdb 早見表 {#pdb-quick-reference}

pdb のプロンプト（`(Pdb)`）で使えます。

| コマンド | はたらき |
|---|---|
| `h` / `h cmd` | ヘルプ |
| `n` | 次の行へ（関数の中には入らない） |
| `s` | 関数の中に入る |
| `r` | いまの関数から抜けるまで進める |
| `c` | 実行を続ける |
| `unt N` | N 行目まで進める |
| `j N` | N 行目に飛ぶ（同じ関数の中だけ） |
| `l` / `ll` | いまの行の周辺 / 関数全体のソースを表示 |
| `w` | いまどこにいるか（スタックトレース） |
| `u` / `d` | スタックを 1 つ上 / 下へ移動 |
| `a` | いまの関数の引数を表示 |
| `p expr` / `pp expr` | 式を表示 / 整形して表示 |
| `display expr` | 停止するたびに式を自動で表示 |
| `b file:line` | ブレークポイントを置く |
| `b func` | 関数に入ったところで止める |
| `b file:line, cond` | 条件つきブレークポイント |
| `cl N` | N 番のブレークポイントを消す |
| `tbreak file:line` | 一度だけ効くブレークポイント |
| `!stmt` | 任意の Python を実行する（代入も可） |
| `interact` | いまのスコープのまま本物の Python REPL に入る（Ctrl+D で戻る） |
| `q` | 終了 |

いちばん強力なのは `interact` です。何でも import でき、複雑なオブジェクトを調べられ、状態を書き換えるメソッドまで呼べます。ローカル変数は既定では読み取り専用なので、書き換えたいときは `(Pdb)` プロンプトから `!x = 42` のようにします。

## レシピ 1: 手元でブレークポイントを置く {#recipe-1-local-breakpoint}

いちばん簡単なやり方です。ファイルをこう書き換えます。

```python
def compute(x, y):
    result = some_helper(x)
    breakpoint()           # <-- drops into pdb here
    return result + y
```

あとは普通に実行します。`breakpoint()` の行で止まり、ローカル変数に自由に触れます。

**コミットする前に `breakpoint()` を消すのを忘れないでください。** `git diff` で確かめるか、コミット前に grep をかけます。
```bash
rg -n 'breakpoint\(\)' --type py
```

## レシピ 2: スクリプトを pdb の下で起動する（ソースは触らない） {#recipe-2-launch-a-script-under-pdb-no-source-edits}

```bash
python -m pdb path/to/script.py arg1 arg2
# Lands at first line of script
(Pdb) b path/to/script.py:42
(Pdb) c
```

## レシピ 3: pytest のテストをデバッグする {#recipe-3-debug-a-pytest-test}

hermes のテストランナーも pytest も、これに対応しています。

```bash
# Drop to pdb on failure (or on any raised exception):
scripts/run_tests.sh tests/path/to/test_file.py::test_name --pdb

# Drop to pdb at the START of the test:
scripts/run_tests.sh tests/path/to/test_file.py::test_name --trace

# Show locals in tracebacks without pdb:
scripts/run_tests.sh tests/path/to/test_file.py --showlocals --tb=long
```

ただし `scripts/run_tests.sh` は、`run_tests_parallel.py` を通してテストファイルごとに出力を取り込んだサブプロセスで走らせます（xdist は使っていません）。そのため、このラッパー越しでは対話的な pdb は動きません。`--pdb` を使いたいときは pytest を直接実行してください。

```bash
source .venv/bin/activate
python -m pytest tests/foo_test.py::test_bar --pdb
```

この方法だと環境を隔離する仕組みは効かなくなります。デバッグ中はそれでかまいませんが、push する前にラッパー越しで走らせ直して確かめてください。

## レシピ 4: どんな例外でも事後解析する {#recipe-4-post-mortem-on-any-exception}

```python

try:
    run_the_thing()
except Exception:
    pdb.post_mortem(sys.exc_info()[2])
```

スクリプト全体を包むこともできます。

```bash
python -m pdb -c continue script.py
# When it crashes, pdb catches it and you're in the frame of the exception
```

REPL や jupyter では、全体にフックを仕掛けるやり方もあります。

```python

def excepthook(etype, value, tb):
    import pdb; pdb.post_mortem(tb)
sys.excepthook = excepthook
```

## レシピ 5: debugpy でリモートからデバッグする（動いているプロセスに接続） {#recipe-5-remote-debug-with-debugpy-attach-to-running-process}

長く動き続けるプロセス向けです。Hermes の gateway、tui_gateway、デーモン、すでに挙動がおかしくてきれいに再起動できないプロセスなどが対象になります。

### 下ごしらえ {#setup}

```bash
source <hermes-agent-repo>/.venv/bin/activate
pip install debugpy
```

### パターン A: ソースを書き換えて、起動時にデバッガの接続を待たせる {#pattern-a-source-edit-process-waits-for-debugger-at-launch}

エントリポイントの先頭近く（またはデバッグしたい関数の中）に、次を足します。

```python

debugpy.listen(("127.0.0.1", 5678))
print("debugpy listening on 5678, waiting for client...", flush=True)
debugpy.wait_for_client()
debugpy.breakpoint()       # optional: pause immediately once attached
```

プロセスを起動すると、`wait_for_client()` のところで止まったまま待ちます。

### パターン B: ソースを触らず、`-m debugpy` で起動する {#pattern-b-no-source-edit-launch-with--m-debugpy}

```bash
python -m debugpy --listen 127.0.0.1:5678 --wait-for-client your_script.py arg1
```

モジュールとして起動する場合も同じ要領です。

```bash
python -m debugpy --listen 127.0.0.1:5678 --wait-for-client -m your.module
```

### パターン C: すでに動いているプロセスに接続する {#pattern-c-attach-to-an-already-running-process}

PID がわかっていて、相手の環境に debugpy が入っていることが前提です。

```bash
python -m debugpy --listen 127.0.0.1:5678 --pid <pid>
# debugpy injects itself into the process. Then attach a client as below.
```

カーネルやセキュリティ設定によっては、ptrace を使った割り込みが止められています（`/proc/sys/kernel/yama/ptrace_scope`）。その場合はこうします。
```bash
echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
```

### ターミナルからクライアントをつなぐ {#connecting-a-client-from-the-terminal}

ターミナル側の DAP クライアントとしていちばん手軽なのは、VS Code の CLI か、小さなスクリプトです。Hermes の中からなら、現実的な選択肢は 2 つあります。

**選択肢 1: `debugpy` 用の自作 CLI REPL** — 公式の機能ではありませんが、ごく小さな DAP クライアントを書けます。

```python
# /tmp/dap_client.py

HOST, PORT = "127.0.0.1", 5678
s = socket.create_connection((HOST, PORT))
seq = itertools.count(1)

def send(msg):
    msg["seq"] = next(seq)
    body = json.dumps(msg).encode()
    s.sendall(f"Content-Length: {len(body)}\r\n\r\n".encode() + body)

def recv():
    header = b""
    while b"\r\n\r\n" not in header:
        header += s.recv(1)
    length = int(header.decode().split("Content-Length:")[1].split("\r\n")[0].strip())
    body = b""
    while len(body) < length:
        body += s.recv(length - len(body))
    return json.loads(body)

send({"type": "request", "command": "initialize", "arguments": {"adapterID": "python"}})
print(recv())
send({"type": "request", "command": "attach", "arguments": {}})
print(recv())
send({"type": "request", "command": "setBreakpoints",
      "arguments": {"source": {"path": sys.argv[1]},
                    "breakpoints": [{"line": int(sys.argv[2])}]}})
print(recv())
send({"type": "request", "command": "configurationDone"})
# ... loop reading events and sending continue/stepIn/etc.
```

一度きりの自動化なら十分ですが、対話的に使うにはつらい方法です。

**選択肢 2: VS Code / Cursor / Zed からつなぐ** — 利用者がそれらを開いているなら、`launch.json` にこう足してもらえます。

```json
{
  "name": "Attach to Hermes",
  "type": "debugpy",
  "request": "attach",
  "connect": { "host": "127.0.0.1", "port": 5678 },
  "justMyCode": false,
  "pathMappings": [
    { "localRoot": "${workspaceFolder}", "remoteRoot": "<hermes-agent-repo>" }
  ]
}
```

**選択肢 3: DAP をやめて `remote-pdb` を使う** — ターミナルで動くエージェントが本当に欲しいのは、たいていこちらです。

```bash
pip install remote-pdb
```

コードにはこう書きます。
```python
from remote_pdb import set_trace
set_trace(host="127.0.0.1", port=4444)   # blocks until connection
```

そのうえで、ターミナルからつなぎます。
```bash
nc 127.0.0.1 4444
# You get a (Pdb) prompt exactly as if debugging locally.
```

`debugpy` の DAP が大げさすぎるとき、`remote-pdb` はエージェントにとっていちばん扱いやすい選択肢です。`debugpy` は、IDE との連携が本当に必要なときだけ使ってください。

## Hermes 固有のプロセスをデバッグする {#debugging-hermes-specific-processes}

### テスト {#tests}
レシピ 3 を見てください。ラッパーはサブプロセスの出力を取り込んでしまうので、対話的な pdb を使うなら pytest を直接実行します。

### `run_agent.py` と CLI — 一度きりの実行 {#runagentpy-cli-one-shot}
いちばん簡単なのは、怪しい行の近くに `breakpoint()` を置いて `hermes` を普通に実行することです。止まった時点で、操作はターミナルに戻ってきます。

### `tui_gateway` のサブプロセス（`hermes --tui` から起動される） {#tuigateway-subprocess-spawned-by-hermes---tui}
gateway は Node 製 TUI の子プロセスとして動きます。やり方は 2 つあります。

**A. gateway のソースを書き換える:**
```python
# tui_gateway/server.py near the top of serve()

debugpy.listen(("127.0.0.1", 5678))
debugpy.wait_for_client()
```
`hermes --tui` を起動します。TUI は固まったように見えます（裏側が待っているためです）。クライアントをつないで `continue` すると、実行が再開します。

**B. 目的のハンドラで `remote-pdb` を使う:**
```python
from remote_pdb import set_trace
set_trace(host="127.0.0.1", port=4444)   # in the RPC handler you want to trap
```
TUI から対応するスラッシュコマンドを実行し、別のターミナルで `nc 127.0.0.1 4444` とつなぎます。

### `_SlashWorker` のサブプロセス {#slashworker-subprocess}
やり方は同じです。ワーカーの `exec` の経路に `remote-pdb` の `set_trace()` を置きます。このワーカーはスラッシュコマンドをまたいで生き続けるので、最初の 1 回は接続するまで止まりますが、以降のスラッシュコマンドは仕掛け直さないかぎりそのまま通ります。

### gateway（`gateway/run.py`） {#gateway-gatewayrunpy}
長く動き続けます。ハンドラに `remote-pdb` を置くか、どのみち gateway を再起動するなら `debugpy` に `--wait-for-client` を付けて使います。

## つまずきやすいところ {#common-pitfalls}

1. **並列実行や出力の取り込みを行うランナーの下では、pdb は何も言わずに効かなくなります。** プロンプトは表示されず、テストがただ固まります（pytest-xdist でも、`scripts/run_tests.sh` がファイルごとに出力を取り込むサブプロセスでも同じです）。対話的にデバッグするときは、1 ファイルに絞って pytest を直接実行してください。

2. **CI や端末のない場所では、`breakpoint()` はプロセスを固まらせます。** 手元では安全ですが、絶対にコミットしないでください。念のため、コミット前の grep を仕掛けておきます。

3. **`PYTHONBREAKPOINT=0`** はすべての `breakpoint()` を無効にします。ブレークポイントで止まらないときは、環境変数を確かめてください。
   ```bash
   echo $PYTHONBREAKPOINT
   ```

4. **`debugpy.listen` だけでは止まりません。`wait_for_client()` も呼ぶ必要があります。** 呼ばないと実行はそのまま進み、クライアントがつながる前に最初のブレークポイントを通り過ぎることがあります。

5. **設定を固めたカーネルでは、PID への接続が失敗します。** `ptrace_scope=1`（Ubuntu の既定）では、同じユーザーの子プロセスに対する ptrace しか許されません。逃げ道は `echo 0 > /proc/sys/kernel/yama/ptrace_scope`（root が必要）か、最初から `debugpy` の下で起動することです。

6. **スレッド。** `pdb` がデバッグできるのは、いまのスレッドだけです。マルチスレッドのコードでは `debugpy`（スレッドを扱える DAP）を使うか、スレッドごとに `threading.settrace()` を設定します。

7. **asyncio。** `pdb` はコルーチンの中でも動きますが、pdb の中で `await` するには Python 3.13 以降が必要で、それより古い版では `interact` モードから `await` します。3.11 や 3.12 では、`asyncio.run_coroutine_threadsafe` を使う小技か、`asyncio.ensure_future` を `!stmt` で呼ぶ形で待ちます。

8. **`scripts/run_tests.sh` は認証情報を取り除き、`HOME=<tmpdir>` を設定します。** バグが利用者の設定や本物の API キーに依存している場合、このラッパーの下では再現しません。まず素の `pytest` で再現させ、そのあとラッパー越しで確かめ直してください。

9. **fork と multiprocessing。** pdb は fork の先を追いません。子プロセスにはそれぞれ `breakpoint()` か `set_trace()` が要ります。Hermes のサブエージェントは、1 プロセスずつデバッグしてください。

## 確認リスト {#verification-checklist}

- [ ] `pip install debugpy` のあと、`python -c "import debugpy; print(debugpy.__version__)"` で入ったことを確かめる
- [ ] リモートデバッグでは、ポートが実際に待ち受けているか確かめる: `ss -tlnp | grep 5678`
- [ ] 最初のブレークポイントで本当に止まる（止まらないなら、`PYTHONBREAKPOINT=0` になっている、並列実行や出力の取り込みを行うランナーの下にいる、接続前に実行が終わっている、のどれかです）
- [ ] `where` または `w` で、想定どおりの呼び出し履歴が出る
- [ ] 後片づけ。コミットするコードに `breakpoint()` や `set_trace()` が残っていない
  ```bash
  rg -n 'breakpoint\(\)|set_trace\(|debugpy\.listen' --type py
  ```

## 場面別のレシピ {#one-shot-recipes}

**「この dict にキーがないのはなぜ?」**
```python
# add above the KeyError site
breakpoint()
# then in pdb:
(Pdb) pp d
(Pdb) pp list(d.keys())
(Pdb) w                # how did we get here
```

**「単体では通るのに、まとめて実行すると落ちるテスト」**
```bash
scripts/run_tests.sh tests/the_test.py   # confirm it fails under the isolated runner first
# For interactive debugging, or if it only fails WITH other tests:
source .venv/bin/activate
python -m pytest tests/ -x --pdb
# Now it pdb-traps at the exact failing test after state accumulated.
```

**「非同期のハンドラがデッドロックする」**
```python
# Add at handler entry

```
ハンドラを動かします。`nc 127.0.0.1 4444` でつなぎ、`w` で止まっているフレームを見て、`!import asyncio; asyncio.all_tasks()` でほかに何が残っているかを見ます。

**「Ink の子プロセスやサブプロセスが落ちたときの事後解析」**
```bash
PYTHONFAULTHANDLER=1 python -m pdb -c continue path/to/entrypoint.py
# On crash, pdb lands at the frame of the exception with full locals
```
