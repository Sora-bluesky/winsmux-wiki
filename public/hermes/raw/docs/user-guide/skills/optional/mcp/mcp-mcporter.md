---
title: "Mcporter — MCP のサーバーやツールを、端末から一覧・認証・呼び出しする"
description: "MCP のサーバーやツールを、端末から一覧・認証・呼び出しする"
upstream_path: user-guide/skills/optional/mcp/mcp-mcporter.md
upstream_blob: cf48fc4297c5b198a3768ba7720804cf831a854f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mcp/mcp-mcporter
---

# Mcporter {#mcporter}

MCP のサーバーやツールを、端末から一覧・認証・呼び出しします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mcp/mcporter` で導入します |
| パス | `optional-skills/mcp\mcporter` |
| バージョン | `1.0.0` |
| 作者 | community |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `MCP`, `Tools`, `API`, `Integrations`, `Interop` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# mcporter {#mcporter}

`mcporter` を使うと、[MCP（Model Context Protocol）](https://modelcontextprotocol.io/) のサーバーやツールを、端末から直接見つけて呼び出し、管理できます。

## 事前に必要なもの {#prerequisites}

Node.js が必要です。
```bash
# No install needed (runs via npx)
npx mcporter list

# Or install globally
npm install -g mcporter
```

## すぐ試す {#quick-start}

```bash
# List MCP servers already configured on this machine
mcporter list

# List tools for a specific server with schema details
mcporter list <server> --schema

# Call a tool
mcporter call <server.tool> key=value
```

## MCP サーバーを見つける {#discovering-mcp-servers}

mcporter は、その端末で他の MCP クライアント（Claude Desktop、Cursor など）が設定したサーバーを自動で見つけます。新しく使えるサーバーを探すときは、[mcpfinder.dev](https://mcpfinder.dev) や [mcp.so](https://mcp.so) といった一覧サイトを見て、その場でつなぎます。

```bash
# Connect to any MCP server by URL (no config needed)
mcporter list --http-url https://some-mcp-server.com --name my_server

# Or run a stdio server on the fly
mcporter list --stdio "npx -y @modelcontextprotocol/server-filesystem" --name fs
```

## ツールを呼び出す {#calling-tools}

```bash
# Key=value syntax
mcporter call linear.list_issues team=ENG limit:5

# Function syntax
mcporter call "linear.create_issue(title: \"Bug fix needed\")"

# Ad-hoc HTTP server (no config needed)
mcporter call https://api.example.com/mcp.fetch url=https://example.com

# Ad-hoc stdio server
mcporter call --stdio "bun run ./server.ts" scrape url=https://example.com

# JSON payload
mcporter call <server.tool> --args '{"limit": 5}'

# Machine-readable output (recommended for Hermes)
mcporter call <server.tool> key=value --output json
```

## 認証と設定 {#auth-and-config}

```bash
# OAuth login for a server
mcporter auth <server | url> [--reset]

# Manage config
mcporter config list
mcporter config get <key>
mcporter config add <server>
mcporter config remove <server>
mcporter config import <path>
```

設定ファイルの場所は `./config/mcporter.json` です（`--config` で変えられます）。

## デーモン {#daemon}

サーバーへの接続をつなぎっぱなしにしておきたいときは、次のようにします。
```bash
mcporter daemon start
mcporter daemon status
mcporter daemon stop
mcporter daemon restart
```

## コードの生成 {#code-generation}

```bash
# Generate a CLI wrapper for an MCP server
mcporter generate-cli --server <name>
mcporter generate-cli --command <url>

# Inspect a generated CLI
mcporter inspect-cli <path> [--json]

# Generate TypeScript types/client
mcporter emit-ts <server> --mode client
mcporter emit-ts <server> --mode types
```

## 補足 {#notes}

- 出力を扱いやすくしたいときは `--output json` を付けて、構造のある形で受け取ります
- その場でつなぐサーバー（HTTP の URL や `--stdio` のコマンド）は設定なしで動くので、一度きりの呼び出しに向いています
- OAuth の認証はブラウザでの操作が必要になることがあります。そのときは `terminal(command="mcporter auth <server>", pty=true)` を使ってください
