---
title: "Siyuan — SiYuan のナレッジベースを API から読み書きする"
description: "SiYuan のナレッジベースを API から読み書きする"
upstream_path: user-guide/skills/optional/productivity/productivity-siyuan.md
upstream_blob: 6747083b07d1e061d29cac7d4f1393a438c2618d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-siyuan
---

# Siyuan {#siyuan}

SiYuan のナレッジベースを API から読み書きします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/productivity/siyuan` で導入します |
| パス | `optional-skills/productivity/siyuan` |
| バージョン | `1.0.0` |
| 作者 | FEUAZUR |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `SiYuan`, `Notes`, `Knowledge Base`, `PKM`, `API` |
| 関連 skill | [`obsidian`](/hermes/docs/user-guide/skills/bundled/note-taking/note-taking-obsidian/), [`notion`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-notion/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# SiYuan のノート API {#siyuan-note-api}

[SiYuan](https://github.com/siyuan-note/siyuan) のカーネル API を curl から使い、自分で立てたナレッジベースのブロックや文書を検索・閲覧・作成・更新・削除します。追加のツールは要りません。curl と API トークンだけで足ります。

## 事前に用意するもの {#prerequisites}

1. SiYuan を入れて動かします（デスクトップ版でも Docker でもかまいません）
2. API トークンを取ります。場所は **Settings > About > API token** です
3. トークンを `${HERMES_HOME:-~/.hermes}/.env` に置きます。
   ```
   SIYUAN_TOKEN=your_token_here
   SIYUAN_URL=http://127.0.0.1:6806
   ```
   `SIYUAN_URL` は指定しなければ `http://127.0.0.1:6806` になります。

## API の基本 {#api-basics}

SiYuan の API はすべて **POST + JSON 本文** です。どの要求も次の形になります。

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/..." \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

応答は JSON で、次の形をしています。
```json
{"code": 0, "msg": "", "data": { ... }}
```
`code: 0` なら成功です。それ以外はエラーなので、`msg` で中身を確かめてください。

**ID の形:** SiYuan の ID は `20210808180117-6v0mkxr` のような形です（14 桁の時刻 + 英数字 7 文字）。

## 早見表 {#quick-reference}

| 操作 | エンドポイント |
|-----------|----------|
| 全文検索 | `/api/search/fullTextSearchBlock` |
| SQL で問い合わせる | `/api/query/sql` |
| ブロックを読む | `/api/block/getBlockKramdown` |
| 子ブロックを読む | `/api/block/getChildBlocks` |
| パスを取得する | `/api/filetree/getHPathByID` |
| 属性を取得する | `/api/attr/getBlockAttrs` |
| ノートブックを一覧する | `/api/notebook/lsNotebooks` |
| 文書を一覧する | `/api/filetree/listDocsByPath` |
| ノートブックを作る | `/api/notebook/createNotebook` |
| 文書を作る | `/api/filetree/createDocWithMd` |
| ブロックを末尾に足す | `/api/block/appendBlock` |
| ブロックを更新する | `/api/block/updateBlock` |
| 文書の名前を変える | `/api/filetree/renameDocByID` |
| 属性を設定する | `/api/attr/setBlockAttrs` |
| ブロックを削除する | `/api/block/deleteBlock` |
| 文書を削除する | `/api/filetree/removeDocByID` |
| Markdown で書き出す | `/api/export/exportMdContent` |

## よく使う操作 {#common-operations}

### 検索（全文） {#search-full-text}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/search/fullTextSearchBlock" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "meeting notes", "page": 0}' | jq '.data.blocks[:5]'
```

### 検索（SQL） {#search-sql}

ブロックのデータベースに直接問い合わせます。安全に使えるのは SELECT だけです。

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/query/sql" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stmt": "SELECT id, content, type, box FROM blocks WHERE content LIKE '\''%keyword%'\'' AND type='\''p'\'' LIMIT 20"}' | jq '.data'
```

よく使う列は `id`、`parent_id`、`root_id`、`box`（ノートブックの ID）、`path`、`content`、`type`、`subtype`、`created`、`updated` です。

### ブロックの中身を読む {#read-block-content}

ブロックの中身を Kramdown（Markdown に近い書式）で返します。

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/getBlockKramdown" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "20210808180117-6v0mkxr"}' | jq '.data.kramdown'
```

### 子ブロックを読む {#read-child-blocks}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/getChildBlocks" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "20210808180117-6v0mkxr"}' | jq '.data'
```

### 人が読めるパスを取得する {#get-human-readable-path}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/filetree/getHPathByID" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "20210808180117-6v0mkxr"}' | jq '.data'
```

### ブロックの属性を取得する {#get-block-attributes}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/attr/getBlockAttrs" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "20210808180117-6v0mkxr"}' | jq '.data'
```

### ノートブックを一覧する {#list-notebooks}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/notebook/lsNotebooks" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.data.notebooks[] | {id, name, closed}'
```

### ノートブックの中の文書を一覧する {#list-documents-in-a-notebook}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/filetree/listDocsByPath" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notebook": "NOTEBOOK_ID", "path": "/"}' | jq '.data.files[] | {id, name}'
```

### 文書を作る {#create-a-document}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/filetree/createDocWithMd" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notebook": "NOTEBOOK_ID",
    "path": "/Meeting Notes/2026-03-22",
    "markdown": "# Meeting Notes\n\n- Discussed project timeline\n- Assigned tasks"
  }' | jq '.data'
```

### ノートブックを作る {#create-a-notebook}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/notebook/createNotebook" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My New Notebook"}' | jq '.data.notebook.id'
```

### 文書の末尾にブロックを足す {#append-block-to-document}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/appendBlock" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentID": "DOCUMENT_OR_BLOCK_ID",
    "data": "New paragraph added at the end.",
    "dataType": "markdown"
  }' | jq '.data'
```

ほかに `/api/block/prependBlock`（引数は同じで、先頭に差し込みます）と `/api/block/insertBlock`（`parentID` の代わりに `previousID` を使い、指定したブロックの後ろに差し込みます）も使えます。

### ブロックの中身を更新する {#update-block-content}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/updateBlock" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "BLOCK_ID",
    "data": "Updated content here.",
    "dataType": "markdown"
  }' | jq '.data'
```

### 文書の名前を変える {#rename-a-document}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/filetree/renameDocByID" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "DOCUMENT_ID", "title": "New Title"}'
```

### ブロックの属性を設定する {#set-block-attributes}

独自の属性には `custom-` を付ける決まりです。

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/attr/setBlockAttrs" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "BLOCK_ID",
    "attrs": {
      "custom-status": "reviewed",
      "custom-priority": "high"
    }
  }'
```

### ブロックを削除する {#delete-a-block}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/block/deleteBlock" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "BLOCK_ID"}'
```

文書ごと削除するには `/api/filetree/removeDocByID` に `{"id": "DOC_ID"}` を渡します。
ノートブックを削除するには `/api/notebook/removeNotebook` に `{"notebook": "NOTEBOOK_ID"}` を渡します。

### 文書を Markdown で書き出す {#export-document-as-markdown}

```bash
curl -s -X POST "${SIYUAN_URL:-http://127.0.0.1:6806}/api/export/exportMdContent" \
  -H "Authorization: Token $SIYUAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "DOCUMENT_ID"}' | jq -r '.data.content'
```

## ブロックの種類 {#block-types}

SQL でよく出てくる `type` の値は次のとおりです。

| 種類 | 説明 |
|------|-------------|
| `d` | 文書（いちばん上のブロック） |
| `p` | 段落 |
| `h` | 見出し |
| `l` | リスト |
| `i` | リストの項目 |
| `c` | コードブロック |
| `m` | 数式ブロック |
| `t` | 表 |
| `b` | 引用 |
| `s` | スーパーブロック |
| `html` | HTML ブロック |

## つまずきやすいところ {#pitfalls}

- **すべて POST です。** 読むだけの操作でも POST を使います。GET は使えません。
- **SQL の扱い**: SELECT だけにしてください。INSERT / UPDATE / DELETE / DROP は危ないので、決して送らないでください。
- **ID の確認**: ID は `YYYYMMDDHHmmss-xxxxxxx` の形です。それ以外は受け付けないでください。
- **エラーの扱い**: `data` を読む前に、応答が `code != 0` でないかを必ず確かめてください。
- **大きな文書**: ブロックの中身も書き出しの結果も、とても大きくなることがあります。SQL には `LIMIT` を付け、`jq` に通して必要なところだけ取り出してください。
- **ノートブックの ID**: 特定のノートブックを扱うときは、先に `lsNotebooks` で ID を調べてください。

## 別の方法: MCP サーバー {#alternative-mcp-server}

curl ではなく、そのまま組み込める形が良ければ、SiYuan の MCP サーバーを入れてください。

```yaml
# In ~/.hermes/config.yaml under mcp_servers:
mcp_servers:
  siyuan:
    command: npx
    args: ["-y", "@porkll/siyuan-mcp"]
    env:
      SIYUAN_TOKEN: "your_token"
      SIYUAN_URL: "http://127.0.0.1:6806"
```
