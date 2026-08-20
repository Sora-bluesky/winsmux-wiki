---
title: "Notion — Notion API と ntn CLI: ページ、データベース、Markdown、Workers"
description: "Notion API と ntn CLI: ページ、データベース、Markdown、Workers"
upstream_path: user-guide/skills/bundled/productivity/productivity-notion.md
upstream_blob: 985240ca41f5e2f30327d491f791f4b8116910e0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-notion
---

# Notion {#notion}

Notion API と ntn CLI で、ページ、データベース、Markdown、Workers を扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/notion` |
| バージョン | `2.0.0` |
| 作者 | community |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Notion`, `Productivity`, `Notes`, `Database`, `API`, `CLI`, `Workers` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Notion {#notion}

Notion とのやり取りには 2 つの道があります。同じ統合トークンでどちらも動くので、使える方を選んでください。

◆ **`ntn` CLI** — Notion 公式の CLI です。書き方が短く、ファイルのアップロードが 1 行で済み、Workers を使うにはこちらが必須です。2026 年 5 月時点では macOS と Linux のみ対応（Windows は「近日対応」）。**入っていればこちらが既定です。**
◆ **HTTP と curl** — Windows も含めてどこでも動きます。`ntn` が入っていないときの **既定の代わり** です。

## 準備 {#setup}

### 1. 統合トークンを取得する（どちらの道でも必要） {#1-get-an-integration-token-required-for-both-paths}

1. https://notion.so/my-integrations で統合を作ります
2. API キー（`ntn_` か `secret_` で始まります）をコピーします
3. `${HERMES_HOME:-~/.hermes}/.env` に保存します:
   ```
   NOTION_API_KEY=ntn_your_key_here
   ```
4. **対象のページやデータベースを、その統合と共有します。** Notion のページのメニュー `...` →`Connect to` → 作った統合の名前、と進みます。これをしていないと、ページが実在していても API は 404 を返します。

### 2. `ntn` を入れる（macOS と Linux ではこちらが本命） {#2-install-ntn-preferred-path-on-macos-linux}

```bash
# Recommended
curl -fsSL https://ntn.dev | bash

# Or via npm (needs Node 22+, npm 10+)
npm install --global ntn

ntn --version    # verify
```

**`ntn login` は使わず、統合トークンで通してください。** そうすればブラウザーなしで、画面のない環境でも動きます。
```bash
export NOTION_API_TOKEN=$NOTION_API_KEY      # ntn reads NOTION_API_TOKEN
export NOTION_KEYRING=0                       # don't try to use the OS keychain
```

この export を、シェルのプロファイル（または `${HERMES_HOME:-~/.hermes}/.env`）に足しておくと、どのセッションでも引き継がれます。

### 3. 実行時にどちらの道か決める {#3-choose-path-at-runtime}

```bash
if command -v ntn >/dev/null 2>&1; then
  # use ntn
else
  # fall back to curl
fi
```

Windows の場合、`ntn` がネイティブ対応するまでは手順 2 をまるごと飛ばしてください。道 B で問題なく動きます。いま CLI の使い勝手がほしいなら、WSL2 の中に `ntn` を入れる手もあります。

## API の基本 {#api-basics}

HTTP のリクエストには、すべて `Notion-Version: 2025-09-03` が必要です。`ntn` を使えば自動で付きます。このバージョンでは、利用者が「データベース」と呼んでいるものが、API では **data source** という名前になっています。

## 道 A — `ntn` CLI（本命。macOS と Linux） {#path-a-ntn-cli-preferred-macos-linux}

### API を直接呼ぶ（curl の短い書き方） {#raw-api-calls-shorthand-for-curl}
```bash
ntn api v1/users                                  # GET
ntn api v1/pages parent[page_id]=abc123 \         # POST with inline body
  properties[title][0][text][content]="Notes"
ntn api v1/pages/abc123 -X PATCH archived:=true   # PATCH; := is non-string (bool/num/null)
```

書き方の注意点:
- `key=value` — 文字列の項目
- `key[nested]=value` — 入れ子になったオブジェクトの項目
- `key:=value` — 型付きの代入（真偽値、数値、null、配列）

### 検索 {#search}
```bash
ntn api v1/search query="page title"
```

### ページの情報を読む {#read-page-metadata}
```bash
ntn api v1/pages/{page_id}
```

### ページを Markdown として読む（エージェント向き） {#read-page-as-markdown-agent-friendly}
```bash
ntn api v1/pages/{page_id}/markdown
```

### ページの中身をブロックとして読む {#read-page-content-as-blocks}
```bash
ntn api v1/blocks/{page_id}/children
```

### Markdown からページを作る {#create-page-from-markdown}
```bash
ntn api v1/pages \
  parent[page_id]=xxx \
  properties[title][0][text][content]="Notes from meeting" \
  markdown="# Agenda

- Q3 roadmap
- Hiring"
```

### Markdown でページを更新する {#patch-a-page-with-markdown}
```bash
ntn api v1/pages/{page_id}/markdown -X PATCH \
  markdown="## Update

Shipped the prototype."
```

### データベース（data source）に問い合わせる {#query-a-database-data-source}
```bash
ntn api v1/data_sources/{data_source_id}/query -X POST \
  filter[property]=Status filter[select][equals]=Active
```

`sorts` や複数の絞り込み条件、条件の組み合わせが要る込み入った問い合わせは、JSON を流し込んでください。
```bash
echo '{"filter": {"property": "Status", "select": {"equals": "Active"}}, "sorts": [{"property": "Date", "direction": "descending"}]}' | \
  ntn api v1/data_sources/{data_source_id}/query -X POST --json -
```

### ファイルのアップロード（1 行で済む。CLI のいちばんの利点） {#file-uploads-one-liner-biggest-cli-win}
```bash
ntn files create < photo.png
ntn files create --external-url https://example.com/photo.png
ntn files list
```

HTTP でやると 3 段階（アップロード枠を作る → バイト列を PUT → 参照する）になるのと比べてみてください。

### 便利な環境変数 {#useful-env-vars}
| 変数 | はたらき |
|---|---|
| `NOTION_API_TOKEN` | 認証トークン（キーチェーンより優先されます）。統合トークンをここに入れます |
| `NOTION_KEYRING=0` | OS のキーチェーンではなく、`~/.config/notion/auth.json` のファイルに認証情報を置きます |
| `NOTION_WORKSPACE_ID` | ワークスペースを選ぶ問いかけを飛ばします |

## 道 B — HTTP と curl（どの環境でも動く。Windows での既定） {#path-b-http-curl-cross-platform-default-on-windows}

リクエストはどれも次の形が土台になります。

```bash
curl -s -X GET "https://api.notion.com/v1/..." \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json"
```

Windows では、Windows 10 以降に同梱の `curl` がそのまま使えます。PowerShell を使う人は `Invoke-RestMethod` でもかまいません。

### 検索 {#search}
```bash
curl -s -X POST "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"query": "page title"}'
```

### ページの情報を読む {#read-page-metadata}
```bash
curl -s "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03"
```

### ページを Markdown として読む（エージェント向き） {#read-page-as-markdown-agent-friendly}

ブロックの JSON より、モデルに渡しやすい形です。

```bash
curl -s "https://api.notion.com/v1/pages/{page_id}/markdown" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03"
```

### ページの中身をブロックとして読む（構造が要るとき） {#read-page-content-as-blocks-when-you-need-structure}
```bash
curl -s "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03"
```

### Markdown からページを作る {#create-page-from-markdown}

`POST /v1/pages` は `markdown` という本文の項目を受け付けます。

```bash
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"page_id": "xxx"},
    "properties": {"title": [{"text": {"content": "Notes from meeting"}}]},
    "markdown": "# Agenda\n\n- Q3 roadmap\n- Hiring\n\n## Decisions\n- Ship MVP Friday"
  }'
```

### Markdown でページを更新する {#patch-a-page-with-markdown}
```bash
curl -s -X PATCH "https://api.notion.com/v1/pages/{page_id}/markdown" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"markdown": "## Update\n\nShipped the prototype."}'
```

### データベースの中にページを作る（型付きのプロパティ） {#create-page-in-a-database-typed-properties}
```bash
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"database_id": "xxx"},
    "properties": {
      "Name": {"title": [{"text": {"content": "New Item"}}]},
      "Status": {"select": {"name": "Todo"}}
    }
  }'
```

### データベース（data source）に問い合わせる {#query-a-database-data-source}
```bash
curl -s -X POST "https://api.notion.com/v1/data_sources/{data_source_id}/query" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"property": "Status", "select": {"equals": "Active"}},
    "sorts": [{"property": "Date", "direction": "descending"}]
  }'
```

### データベースを作る {#create-a-database}
```bash
curl -s -X POST "https://api.notion.com/v1/data_sources" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"page_id": "xxx"},
    "title": [{"text": {"content": "My Database"}}],
    "properties": {
      "Name": {"title": {}},
      "Status": {"select": {"options": [{"name": "Todo"}, {"name": "Done"}]}},
      "Date": {"date": {}}
    }
  }'
```

### ページのプロパティを更新する {#update-page-properties}
```bash
curl -s -X PATCH "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Status": {"select": {"name": "Done"}}}}'
```

### ページにブロックを足す {#append-blocks-to-a-page}
```bash
curl -s -X PATCH "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "children": [
      {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"text": {"content": "Hello from Hermes!"}}]}}
    ]
  }'
```

### ファイルのアップロード（3 段階） {#file-uploads-3-step-flow}
```bash
# 1. Create upload
curl -s -X POST "https://api.notion.com/v1/file_uploads" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"filename": "photo.png", "content_type": "image/png"}'

# 2. PUT bytes to the upload_url returned above
curl -s -X PUT "{upload_url}" --data-binary @photo.png

# 3. Reference {file_upload_id} in a page/block payload
```

## プロパティの型 {#property-types}

データベースの項目でよく使うプロパティの書き方です。

- **タイトル:** `{"title": [{"text": {"content": "..."}}]}`
- **リッチテキスト:** `{"rich_text": [{"text": {"content": "..."}}]}`
- **セレクト:** `{"select": {"name": "Option"}}`
- **マルチセレクト:** `{"multi_select": [{"name": "A"}, {"name": "B"}]}`
- **日付:** `{"date": {"start": "2026-01-15", "end": "2026-01-16"}}`
- **チェックボックス:** `{"checkbox": true}`
- **数値:** `{"number": 42}`
- **URL:** `{"url": "https://..."}`
- **メール:** `{"email": "user@example.com"}`
- **リレーション:** `{"relation": [{"id": "page_id"}]}`

## API バージョン 2025-09-03 — データベースと data source {#api-version-2025-09-03-databases-vs-data-sources}

- **データベースは data source になりました。** 問い合わせと取得には `/data_sources/` のエンドポイントを使います。
- **データベース 1 つにつき ID が 2 つあります。** `database_id` と `data_source_id` です。
  - ページを作るときは `database_id`: `parent: {"database_id": "..."}`
  - 問い合わせるときは `data_source_id`: `POST /v1/data_sources/{id}/query`
- 検索の結果では、データベースは `"object": "data_source"` として返り、`data_source_id` の項目が付きます。

## Notion Workers（応用。`ntn` が必要） {#notion-workers-advanced-requires-ntn}

Workers は、Notion が代わりに動かしてくれる TypeScript のプログラムです。1 つの worker に、次を好きな組み合わせで持たせられます。
- **Syncs** — 外部の API からデータを取ってきて、決まった間隔（既定は 30 分）で Notion のデータベースに入れます。
- **Tools** — Notion の Custom Agents の中から呼べるツールとして出てきます。
- **Webhooks** — 外部サービス（GitHub、Stripe など）から HTTP のイベントを受け取り、Notion の側で動きます。

**プランと対応環境の制限:**
- CLI はどのプランでも使えます。**Workers を配備するには Business か Enterprise が必要です。**
- `ntn` は 2026 年 5 月時点で macOS と Linux のみです。Windows では WSL2 を使うか、ネイティブ対応を待つことになります。
- 2026 年 8 月 11 日までは無料で、それ以降は Notion のクレジットによる従量制です。

### いちばん小さい Worker {#minimal-worker}

```bash
ntn workers new my-worker      # scaffold
cd my-worker
# Edit src/index.ts
ntn workers deploy --name my-worker
```

`src/index.ts`:
```typescript

const worker = new Worker();
export default worker;

worker.tool("greet", {
  title: "Greet a User",
  description: "Returns a friendly greeting",
  inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
  execute: async ({ name }) => `Hello, ${name}!`,
});
```

### Webhook のしくみ {#webhook-capability}

```typescript
worker.webhook("onGithubPush", {
  title: "GitHub Push Handler",
  execute: async (events, { notion }) => {
    for (const event of events) {
      // event.body, event.rawBody (for signature verification), event.headers
      console.log("got delivery", event.deliveryId);
    }
  },
});
```

配備したあと、`ntn workers webhooks list` を実行すると、Notion が発行した URL が出ます。この URL は秘密として扱ってください。署名の検証を入れない限り、URL を知っている人は誰でもイベントを POST できます。

### Worker の運用コマンド {#worker-lifecycle-commands}

```bash
ntn workers deploy
ntn workers list
ntn workers exec <capability-key> -d '{"name": "world"}'
ntn workers sync trigger <key>            # run a sync now
ntn workers sync pause <key>
ntn workers env set GITHUB_WEBHOOK_SECRET=...
ntn workers runs list                     # recent invocations
ntn workers runs logs <run-id>
ntn workers webhooks list
```

Worker を作ってほしいと頼まれたら、`ntn workers new` でひな形を作り、`src/index.ts` にコードを書き、必要な秘密の値を `ntn workers env set` で設定して、配備してください。API の全体像は Notion の公式ドキュメント https://developers.notion.com/workers にあります。

## Notion 流の Markdown（`/markdown` のエンドポイントで使うもの） {#notion-flavored-markdown-used-by-markdown-endpoints}

標準の CommonMark に、Notion 独自のブロック用として XML に似たタグを足したものです。字下げには **タブ** を使います。

**CommonMark にないブロック:**
```
<callout icon="🎯" color="blue_bg">
	Ship the MVP by **Friday**.
</callout>

<details color="gray">
<summary>Toggle title</summary>
	Children indented one tab
</details>

<columns>
	<column>Left side</column>
	<column>Right side</column>
</columns>

<table_of_contents color="gray"/>
```

**行の中で使うもの:**
- メンション: `<mention-user url="..."/>`、`<mention-page url="...">Title</mention-page>`、`<mention-date start="2026-05-15"/>`
- 下線: `<span underline="true">text</span>`
- 色: `<span color="blue">text</span>`、またはブロック単位で 1 行目に `{color="blue"}`
- 数式: 行の中は `$x^2$`、ブロックは `$$ ... $$`
- 出典: `[^https://example.com]`

**色:** `gray brown orange yellow green blue purple pink red` と、背景用の `*_bg` 付きのもの。

見出しの 5 と 6 は H4 にまとめられます。`>` の行を複数並べると別々の引用ブロックになるので、複数行の引用は 1 つの `>` の中で `<br>` を使ってください。

## どちらの道を選ぶか {#choosing-the-right-path}

| やること | mac / Linux | Windows |
|---|---|---|
| ページの読み書き、検索、データベースへの問い合わせ | `ntn api ...` | curl |
| エージェントに要約させるためにページを読む | `ntn api v1/pages/{id}/markdown` | curl で `/markdown` のエンドポイント |
| ファイルをアップロードする | `ntn files create < file` | HTTP の 3 段階 |
| API をちょっと試す | `ntn api ...` | curl |
| Notion が動かす sync / webhook / エージェント用ツールを作る | `ntn workers ...` | WSL2 と `ntn workers ...` |

## 補足 {#notes}

- ページとデータベースの ID は UUID です（ハイフンはあってもなくても受け付けます）。
- レート制限はおよそ 1 秒あたり 3 リクエストです。CLI を使ってもこれは変わりません。
- API からデータベースの **ビュー** の絞り込みは設定できません。これは画面からのみです。
- data source を作るとき `"is_inline": true` を指定すると、ページの中に埋め込めます。
- curl には必ず `-s` を付けて、進捗表示を消してください（エージェントの出力がきれいになります）。
- 読み取った結果は `jq` に通すと扱いやすくなります: `... | jq '.results[0].properties'`。
- Notion は MCP サーバー（`Notion MCP`。データベース操作のトークン消費が前の版より約 91% 少なくなっています）も出しています。セッションの中から流れるように Notion を扱いたいなら Hermes の MCP 対応でつないでください。ただし、一度きりの作業なら、ここまでのやり方で足ります。
