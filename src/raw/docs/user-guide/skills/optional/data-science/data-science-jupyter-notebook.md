---
title: "Jupyter Notebook — 動いている Jupyter カーネルで Python を少しずつ試す（hamelnb）"
description: "動いている Jupyter カーネルで Python を少しずつ試す（hamelnb）"
upstream_path: user-guide/skills/optional/data-science/data-science-jupyter-notebook.md
upstream_blob: a869a968d218f28b9f31dcb8768cdd78cf949863
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/data-science/data-science-jupyter-notebook
---

# Jupyter Notebook {#jupyter-notebook}

動いている Jupyter カーネルで Python を少しずつ試します（hamelnb）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/data-science/jupyter-notebook` で導入します |
| パス | `optional-skills/data-science/jupyter-notebook` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `jupyter`, `notebook`, `repl`, `data-science`, `exploration`, `iterative` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Jupyter Notebook (hamelnb live kernel) {#jupyter-notebook-hamelnb-live-kernel}

動いている Jupyter カーネルを通じて、**状態が残る Python の REPL** を使えるようにします。変数は
実行をまたいで残ります。状態を少しずつ積み上げたいとき、API を触って試したいとき、DataFrame を
覗きたいとき、込み入ったコードを何度も直したいときは、`execute_code` ではなくこちらを使います。

## 他のツールとの使い分け {#when-to-use-this-vs-other-tools}

| ツール | こんなとき |
|------|----------|
| **この skill** | 少しずつ試す作業、手順をまたいで状態を残したいとき、データサイエンス、機械学習、「ちょっと試して確かめたい」 |
| `execute_code` | hermes のツール（web_search、ファイル操作）を使う、一度きりのスクリプト。状態は残りません。 |
| `terminal` | シェルのコマンド、ビルド、インストール、git、プロセスの管理 |

**目安:** その作業に Jupyter ノートブックが欲しくなるなら、この skill を使ってください。

## 前提条件 {#prerequisites}

1. **uv** が入っていること（確認: `which uv`）
2. **JupyterLab** が入っていること: `uv tool install jupyterlab`
3. Jupyter サーバーが動いていること（下の「セットアップ」を参照）

## セットアップ {#setup}

hamelnb のスクリプトの場所:
```
SCRIPT="$HOME/.agent-skills/hamelnb/skills/jupyter-live-kernel/scripts/jupyter_live_kernel.py"
```

まだクローンしていない場合:
```
git clone https://github.com/hamelsmu/hamelnb.git ~/.agent-skills/hamelnb
```

### JupyterLab を起動する {#starting-jupyterlab}

すでにサーバーが動いていないか確かめます:
```
uv run "$SCRIPT" servers
```

見つからなければ、起動します:
```
jupyter-lab --no-browser --port=8888 --notebook-dir=$HOME/notebooks \
  --IdentityProvider.token='' --ServerApp.password='' > /tmp/jupyter.log 2>&1 &
sleep 3
```

補足: ローカルのエージェントから触れるように、トークンとパスワードを無効にしています。
サーバーは画面を持たずに動きます。

### REPL 用のノートブックを作る {#creating-a-notebook-for-repl-use}

REPL だけあればよく、既存のノートブックがない場合は、最小限のノートブックファイルを作ります:
```
mkdir -p ~/notebooks
```
空のコードセルを 1 つだけ持つ最小の .ipynb を JSON で書き、Jupyter の REST API 経由で
カーネルのセッションを開始します:
```
curl -s -X POST http://127.0.0.1:8888/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"path":"scratch.ipynb","type":"notebook","name":"scratch.ipynb","kernel":{"name":"python3"}}'
```

## 基本の流れ {#core-workflow}

どのコマンドも構造化された JSON を返します。トークンを節約するため、必ず `--compact` を
付けてください。

### 1. サーバーとノートブックを探す {#1-discover-servers-and-notebooks}

```
uv run "$SCRIPT" servers --compact
uv run "$SCRIPT" notebooks --compact
```

### 2. コードを実行する（主に使う操作） {#2-execute-code-primary-operation}

```
uv run "$SCRIPT" execute --path <notebook.ipynb> --code '<python code>' --compact
```

execute をまたいで状態は残ります。変数も import もオブジェクトも、すべて生き続けます。

複数行のコードは $'...' の引用で書けます:
```
uv run "$SCRIPT" execute --path scratch.ipynb --code $'import os\nfiles = os.listdir(".")\nprint(f"Found {len(files)} files")' --compact
```

### 3. 生きている変数を覗く {#3-inspect-live-variables}

```
uv run "$SCRIPT" variables --path <notebook.ipynb> list --compact
uv run "$SCRIPT" variables --path <notebook.ipynb> preview --name <varname> --compact
```

### 4. ノートブックのセルを編集する {#4-edit-notebook-cells}

```
# View current cells
uv run "$SCRIPT" contents --path <notebook.ipynb> --compact

# Insert a new cell
uv run "$SCRIPT" edit --path <notebook.ipynb> insert \
  --at-index <N> --cell-type code --source '<code>' --compact

# Replace cell source (use cell-id from contents output)
uv run "$SCRIPT" edit --path <notebook.ipynb> replace-source \
  --cell-id <id> --source '<new code>' --compact

# Delete a cell
uv run "$SCRIPT" edit --path <notebook.ipynb> delete --cell-id <id> --compact
```

### 5. 検証（再起動して全実行） {#5-verification-restart-run-all}

ユーザーがまっさらな状態での検証を求めたときや、ノートブックが上から下まで通ることを
確かめたいときだけ使ってください:

```
uv run "$SCRIPT" restart-run-all --path <notebook.ipynb> --save-outputs --compact
```

## 実際に使って分かったこと {#practical-tips-from-experience}

1. **サーバー起動後の最初の実行はタイムアウトすることがあります** — カーネルの準備に少し
   かかります。タイムアウトしたら、もう一度実行するだけで大丈夫です。

2. **カーネルの Python は JupyterLab の Python です** — パッケージはその環境に入っている
   必要があります。追加のパッケージが要るなら、先に JupyterLab のツール環境へ入れてください。

3. **--compact を付けるとトークンがかなり減ります** — 必ず付けてください。付けないと JSON の
   出力がとても長くなります。

4. **純粋に REPL として使うなら**、scratch.ipynb を作って、セルの編集は気にせず `execute` を
   繰り返すだけにします。

5. **引数の順番が効きます** — `--path` のようなサブコマンドのフラグは、その下のサブコマンドの
   **前**に置きます。たとえば `variables --path nb.ipynb list` であって、
   `variables list --path nb.ipynb` ではありません。

6. **セッションがまだ無い場合**は、REST API から開始する必要があります（「セットアップ」を
   参照）。生きたカーネルのセッションがないと、このツールは実行できません。

7. **エラーは JSON で返ります**。トレースバック付きなので、`ename` と `evalue` を読んで何が
   起きたか把握してください。

8. **websocket がときどきタイムアウトします** — 一部の操作は、特にカーネルの再起動直後に、
   1 回目でタイムアウトすることがあります。問題として上げる前に一度やり直してください。

9. **そのホストで websocket が毎回タイムアウトするなら**、zmq の通信に切り替えます:
   `uv run "$SCRIPT" execute --transport zmq ...`。症状は、execute のたびに
   「Websocket execution may already have reached the kernel, so auto fallback was
   skipped」が返ることです。カーネル自体はきちんと動いています（REST では
   execution_state=idle が返り、execution_count も増えます）。壊れているのは websocket の
   返信経路だけです。zmq の通信は jupyter_client を直接使うので、この問題を回避できます。

10. **REST だけで使うサーバーを新しく立てるとき**は、`--ServerApp.disable_check_xsrf=True` を
    足してください。付けないと POST /api/sessions が
    `"'_xsrf' argument missing from POST"` を返し、カーネルのセッションを作れません。

## タイムアウトの既定値 {#timeout-defaults}

このスクリプトは 1 回の実行につき 30 秒を既定のタイムアウトにしています。長くかかる処理には
`--timeout 120` を渡してください。最初のセットアップや重い計算では、60 秒以上のゆとりのある
値にします。
