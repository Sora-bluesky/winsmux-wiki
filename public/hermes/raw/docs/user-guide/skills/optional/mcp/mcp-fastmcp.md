---
title: "Fastmcp — Python で MCP サーバーを作り、試し、公開する"
description: "Python で MCP サーバーを作り、試し、公開する"
upstream_path: user-guide/skills/optional/mcp/mcp-fastmcp.md
upstream_blob: 8012434d42d1316285fa2786a132232f9182097c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mcp/mcp-fastmcp
---

# Fastmcp {#fastmcp}

Python で MCP サーバーを作り、試し、公開します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mcp/fastmcp` で入れます |
| パス | `optional-skills/mcp/fastmcp` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `MCP`, `FastMCP`, `Python`, `Tools`, `Resources`, `Prompts`, `Deployment` |
| 関連 skill | [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/), [`mcporter`](/hermes/docs/user-guide/skills/optional/mcp/mcp-mcporter/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# FastMCP {#fastmcp}

FastMCP を使って Python で MCP サーバーを作り、手元で動作を確かめ、MCP クライアントに登録し、HTTP のエンドポイントとして公開します。

## いつ使うか {#when-to-use}

次のような作業のときに、この skill を使います。

- Python で新しい MCP サーバーを作る
- API・データベース・CLI・ファイル処理の流れを MCP のツールとして包む
- ツールに加えて、リソースやプロンプトも見せる
- Hermes などのクライアントにつなぐ前に、FastMCP の CLI でサーバーをひととおり試す
- Claude Code、Claude Desktop、Cursor といった MCP クライアントにサーバーを登録する
- FastMCP のサーバーのリポジトリを、HTTP で公開できる形に整える

サーバーがすでにあって、あとは Hermes につなぐだけなら `native-mcp` を使います。作るのではなく、既存の MCP サーバーを CLI から手早く叩きたいだけなら `mcporter` を使います。

## 事前に必要なもの {#prerequisites}

まず、作業する環境に FastMCP を入れます。

```bash
pip install fastmcp
fastmcp version
```

API 用のテンプレートを使うなら、`httpx` が入っていない場合は入れておきます。

```bash
pip install httpx
```

## 同梱されているファイル {#included-files}

### テンプレート {#templates}

- `templates/api_wrapper.py` - 認証ヘッダーに対応した REST API のラッパー
- `templates/database_server.py` - 読み取り専用の SQLite クエリサーバー
- `templates/file_processor.py` - テキストファイルの中身を調べて検索するサーバー

### スクリプト {#scripts}

- `scripts/scaffold_fastmcp.py` - テンプレートを写して、サーバー名の差し込み箇所を置き換えます

### 参考資料 {#references}

- `references/fastmcp-cli.md` - FastMCP の CLI の使い方、登録先、公開前の確認事項

## 進め方 {#workflow}

### 1. いちばん小さく成立する形を選ぶ {#1-pick-the-smallest-viable-server-shape}

まずは、役に立つ範囲でいちばん狭い形から始めます。

- API のラッパー: API 全体ではなく、価値の高いエンドポイント 1〜3 個から始めます
- データベースのサーバー: 読み取り専用の構造確認と、範囲を絞ったクエリだけを見せます
- ファイル処理: パスを明示的に受け取り、結果が毎回同じになる操作だけを見せます
- プロンプト・リソース: 使い回せるプロンプトの雛形や、探せる文書がクライアント側で必要になったときだけ足します

ツールの名前がぼんやりした大きなサーバーより、名前と docstring とスキーマがはっきりした薄いサーバーのほうが扱いやすくなります。

### 2. テンプレートから雛形を作る {#2-scaffold-from-a-template}

テンプレートをそのまま写すか、雛形作りの補助スクリプトを使います。

```bash
python ~/.hermes/skills/mcp/fastmcp/scripts/scaffold_fastmcp.py \
  --template api_wrapper \
  --name "Acme API" \
  --output ./acme_server.py
```

使えるテンプレートの一覧はこうして見ます。

```bash
python ~/.hermes/skills/mcp/fastmcp/scripts/scaffold_fastmcp.py --list
```

手で写す場合は、`__SERVER_NAME__` を実際のサーバー名に置き換えてください。

### 3. まずツールから作る {#3-implement-tools-first}

リソースやプロンプトを足す前に、`@mcp.tool` の関数から始めます。

ツールを設計するときの決まりごとです。

- どのツールにも、動詞をもとにした具体的な名前を付けます
- docstring は、利用者が読むツールの説明として書きます
- 引数は明示的に、型を付けて書きます
- できるかぎり JSON にできる構造化されたデータを返します
- 危なそうな入力は早めに弾きます
- 最初の版では、読み取りだけの動きにしておきます

よいツール名の例です。

- `get_customer`
- `search_tickets`
- `describe_table`
- `summarize_text_file`

よくないツール名の例です。

- `run`
- `process`
- `do_thing`

### 4. リソースとプロンプトは、役に立つときだけ足す {#4-add-resources-and-prompts-only-when-they-help}

スキーマ、方針の文書、生成したレポートのように、読み取り専用の安定した内容をクライアントが取りに来ると便利な場合に `@mcp.resource` を足します。

決まった作業の流れに向けて、使い回せるプロンプトの雛形をサーバー側から渡したいときに `@mcp.prompt` を足します。

文書を片っ端からプロンプトにしないでください。次の使い分けをおすすめします。

- 動かすものはツール
- データや文書を取ってくるものはリソース
- 使い回す LLM への指示はプロンプト

### 5. どこかにつなぐ前に、サーバーを試す {#5-test-the-server-before-integrating-it-anywhere}

手元で確かめるには FastMCP の CLI を使います。

```bash
fastmcp inspect acme_server.py:mcp
fastmcp list acme_server.py --json
fastmcp call acme_server.py search_resources query=router limit=5 --json
```

手を入れながら素早く直したいときは、サーバーを手元で動かします。

```bash
fastmcp run acme_server.py:mcp
```

HTTP でのやりとりを手元で試すにはこうします。

```bash
fastmcp run acme_server.py:mcp --transport http --host 127.0.0.1 --port 8000
fastmcp list http://127.0.0.1:8000/mcp --json
fastmcp call http://127.0.0.1:8000/mcp search_resources query=router --json
```

サーバーが動くと言い切る前に、新しいツールそれぞれに対して `fastmcp call` を最低 1 回は実際に流してください。

### 6. 手元で問題がなければクライアントに登録する {#6-install-into-a-client-when-local-validation-passes}

FastMCP は、対応している MCP クライアントにサーバーを登録できます。

```bash
fastmcp install claude-code acme_server.py
fastmcp install claude-desktop acme_server.py
fastmcp install cursor acme_server.py -e .
```

その端末にすでに設定されている MCP サーバーを確かめるには `fastmcp discover` を使います。

Hermes につなぐことが目的なら、次のどちらかにします。

- `native-mcp` の skill を使って `~/.hermes/config.yaml` にサーバーを設定する
- 仕様が固まるまでは、開発中は FastMCP の CLI コマンドを使い続ける

### 7. 手元での仕様が固まってから公開する {#7-deploy-after-the-local-contract-is-stable}

ホスティングを任せたいなら、FastMCP の資料でいちばん詳しく説明されているのは Prefect Horizon です。公開する前に、こうして確認します。

```bash
fastmcp inspect acme_server.py:mcp
```

リポジトリに次のものが入っているか確かめてください。

- FastMCP のサーバーオブジェクトが入った Python のファイル
- `requirements.txt` か `pyproject.toml`
- 公開に必要な環境変数の説明

一般的な HTTP ホスティングを使うなら、まず手元で HTTP でのやりとりを確かめてから、サーバーのポートを外に出せる Python 対応のプラットフォームに載せます。

## よくある型 {#common-patterns}

### API ラッパー型 {#api-wrapper-pattern}

REST や HTTP の API を MCP のツールとして見せるときに使います。

最初に用意するとよい範囲です。

- 読み取りの経路をひとつ
- 一覧・検索の経路をひとつ
- 必要なら死活確認

作るときの注意です。

- 認証情報は直接書かず、環境変数に置きます
- リクエストの処理はひとつの補助関数にまとめます
- API のエラーは、短く状況を添えて返します
- 上流の返り値がばらついているときは、揃えてから返します

`templates/api_wrapper.py` から始めてください。

### データベース型 {#database-pattern}

安全な範囲でクエリと構造確認をできるようにするときに使います。

最初に用意するとよい範囲です。

- `list_tables`
- `describe_table`
- 範囲を絞った読み取りクエリをひとつ

作るときの注意です。

- データベースへのアクセスは既定で読み取り専用にします
- 最初の版では `SELECT` 以外の SQL を弾きます
- 返す行数に上限を設けます
- 行と一緒に列名も返します

`templates/database_server.py` から始めてください。

### ファイル処理型 {#file-processor-pattern}

必要に応じてファイルを調べたり変換したりするサーバーのときに使います。

最初に用意するとよい範囲です。

- ファイルの中身を要約する
- ファイルの中を検索する
- 毎回同じ結果になるメタデータを取り出す

作るときの注意です。

- ファイルのパスは明示的に受け取ります
- ファイルが無い場合と、文字コードで失敗した場合を確かめます
- プレビューと結果の件数に上限を設けます
- どうしても外部のツールが要る場合を除いて、シェルの呼び出しは避けます

`templates/file_processor.py` から始めてください。

## 満たすべき水準 {#quality-bar}

FastMCP のサーバーを引き渡す前に、次のすべてを確かめてください。

- サーバーが問題なく import できる
- `fastmcp inspect <file.py:mcp>` が成功する
- `fastmcp list <server spec> --json` が成功する
- 新しいツールそれぞれについて、`fastmcp call` を実際に 1 回は流してある
- 環境変数が説明されている
- ツールの数が、推測しなくても把握できる程度に収まっている

## 困ったとき {#troubleshooting}

### FastMCP のコマンドが見つからない {#fastmcp-command-missing}

いま使っている環境にパッケージを入れます。

```bash
pip install fastmcp
fastmcp version
```

### `fastmcp inspect` が失敗する {#fastmcp-inspect-fails}

次を確かめてください。

- ファイルを import したときに落ちるような処理が入っていないか
- `<file.py:object>` で指定した FastMCP のインスタンス名が合っているか
- テンプレートが使っている追加のパッケージが入っているか

### Python では動くのに CLI から動かない {#tool-works-in-python-but-not-through-cli}

こうして確かめます。

```bash
fastmcp list server.py --json
fastmcp call server.py your_tool_name --json
```

たいていはこれで、名前の食い違い、必須の引数の抜け、シリアライズできない返り値が見つかります。

### Hermes から公開したサーバーが見えない {#hermes-cannot-see-the-deployed-server}

サーバー側は正しくても、Hermes の設定のほうが合っていないことがあります。`native-mcp` の skill を読み込み、`~/.hermes/config.yaml` にサーバーを設定してから Hermes を再起動してください。

## 参考資料 {#references}

CLI の詳細、登録先、公開前の確認事項は `references/fastmcp-cli.md` を読んでください。
