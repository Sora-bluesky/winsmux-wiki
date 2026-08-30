---
title: "Qmd — メモ・資料・書き起こしを手元でまとめて検索する"
description: "メモ・資料・書き起こしを手元でまとめて検索する"
upstream_path: user-guide/skills/optional/research/research-qmd.md
upstream_blob: 4b0dc1373cbd849cb4071a834b17704bc4621eae
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-qmd
---

# Qmd {#qmd}

メモ・資料・書き起こしを手元でまとめて検索します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加の skill です。`hermes skills install official/research/qmd` で入れられます |
| パス | `optional-skills/research\qmd` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent + Teknium |
| ライセンス | MIT |
| 対応プラットフォーム | macos, linux |
| タグ | `Search`, `Knowledge-Base`, `RAG`, `Notes`, `MCP`, `Local-AI` |
| 関連 skill | [`obsidian`](/hermes/docs/user-guide/skills/bundled/note-taking/note-taking-obsidian/), [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/), [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が動き出したときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# QMD — Query Markup Documents {#qmd-query-markup-documents}

個人の知識をためた場所を、その端末の中だけで検索する仕組みです。markdown のメモ、
打ち合わせの書き起こし、ドキュメント、そのほか文字で書かれたファイルを索引にして、
キーワードの一致・意味の理解・LLM による並べ直しを組み合わせた検索を提供します。
すべて手元で動き、クラウドには頼りません。

作者は [Tobi Lütke](https://github.com/tobi/qmd) さんです。MIT ライセンスです。

## こんなときに使います {#when-to-use}

- 自分のメモ・資料・知識をためた場所・打ち合わせの書き起こしを検索したいと言われたとき
- markdown やテキストのファイルが大量にあり、その中から何かを見つけたいとき
- キーワードの grep ではなく、意味での検索（「X という考えについてのメモを探して」）をしたいとき
- すでに qmd のコレクションを用意していて、そこを検索したいとき
- 手元で使える知識の保管場所や文書検索の仕組みを作りたいと言われたとき
- きっかけになる言葉: 「search my notes」「find in my docs」「knowledge base」「qmd」

## 前提となるもの {#prerequisites}

### Node.js 22 以上（必須） {#nodejs-22-required}

```bash
# Check version
node --version  # must be >= 22

# macOS — install or upgrade via Homebrew
brew install node@22

# Linux — use NodeSource or nvm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
# or with nvm:
nvm install 22 && nvm use 22
```

### 拡張機能を読み込める SQLite（macOS のみ） {#sqlite-with-extension-support-macos-only}

macOS に最初から入っている SQLite は拡張機能を読み込めません。Homebrew で入れてください:

```bash
brew install sqlite
```

### qmd を入れる {#install-qmd}

```bash
npm install -g @tobilu/qmd
# or with Bun:
bun install -g @tobilu/qmd
```

初回の実行時に、手元で動く GGUF のモデル 3 つ（合計 2GB ほど）が自動で落ちてきます:

| モデル | 役割 | サイズ |
|-------|---------|------|
| embeddinggemma-300M-Q8_0 | ベクトルの埋め込み | ~300MB |
| qwen3-reranker-0.6b-q8_0 | 結果の並べ直し | ~640MB |
| qmd-query-expansion-1.7B | 検索語の広げ直し | ~1.1GB |

### 入ったか確かめる {#verify-installation}

```bash
qmd --version
qmd status
```

## 早見表 {#quick-reference}

| コマンド | 何をするか | 速さ |
|---------|-------------|-------|
| `qmd search "query"` | BM25 によるキーワード検索（モデル不要） | ~0.2s |
| `qmd vsearch "query"` | 意味に基づくベクトル検索（モデル 1 つ） | ~3s |
| `qmd query "query"` | ハイブリッド検索と並べ直し（モデル 3 つすべて） | 温まっていれば ~2-3s、冷えていると ~19s |
| `qmd get <docid>` | 文書の全文を取り出す | すぐ |
| `qmd multi-get "glob"` | 複数のファイルを取り出す | すぐ |
| `qmd collection add <path> --name <n>` | ディレクトリをコレクションとして追加する | すぐ |
| `qmd context add <path> "description"` | 検索の精度を上げる説明を追加する | すぐ |
| `qmd embed` | ベクトルの埋め込みを作る・更新する | 場合による |
| `qmd status` | 索引の状態とコレクションの情報を表示する | すぐ |
| `qmd mcp` | MCP サーバーを起動する（stdio） | 起動したまま |
| `qmd mcp --http --daemon` | MCP サーバーを起動する（HTTP、モデルを温めたまま） | 起動したまま |

## 準備の流れ {#setup-workflow}

### 1. コレクションを追加する {#1-add-collections}

文書の入っているディレクトリを qmd に教えます:

```bash
# Add a notes directory
qmd collection add ~/notes --name notes

# Add project docs
qmd collection add ~/projects/myproject/docs --name project-docs

# Add meeting transcripts
qmd collection add ~/meetings --name meetings

# List all collections
qmd collection list
```

### 2. 説明を書き添える {#2-add-context-descriptions}

説明を付けておくと、検索の仕組みが各コレクションの中身を把握しやすくなります。
これは検索の精度をかなり押し上げます:

```bash
qmd context add qmd://notes "Personal notes, ideas, and journal entries"
qmd context add qmd://project-docs "Technical documentation for the main project"
qmd context add qmd://meetings "Meeting transcripts and action items from team syncs"
```

### 3. 埋め込みを作る {#3-generate-embeddings}

```bash
qmd embed
```

すべてのコレクションのすべての文書を処理して、ベクトルの埋め込みを作ります。
文書やコレクションを足したら、もう一度実行してください。

### 4. 確認する {#4-verify}

```bash
qmd status   # shows index health, collection stats, model info
```

## 検索のやり方 {#search-patterns}

### 速いキーワード検索（BM25） {#fast-keyword-search-bm25}

向いているもの: 正確な語、コード中の識別子、名前、覚えている言い回し。
モデルを読み込まないので、ほぼ待たずに結果が出ます。

```bash
qmd search "authentication middleware"
qmd search "handleError async"
```

### 意味に基づくベクトル検索 {#semantic-vector-search}

向いているもの: 話し言葉での質問、概念を手がかりにした検索。
埋め込みのモデルを読み込みます（最初の検索で 3 秒ほど）。

```bash
qmd vsearch "how does the rate limiter handle burst traffic"
qmd vsearch "ideas for improving onboarding flow"
```

### 並べ直しを伴うハイブリッド検索（いちばん精度が高い） {#hybrid-search-with-reranking-best-quality}

向いているもの: 精度を優先したい大事な検索。
モデル 3 つすべてを使い、検索語を広げ、BM25 とベクトル検索を同時に走らせ、結果を並べ直します。

```bash
qmd query "what decisions were made about the database migration"
```

### 複数のやり方を組み合わせた検索 {#structured-multi-mode-queries}

ひとつの検索の中で種類を組み合わせて、狙いを絞ります:

```bash
# BM25 for exact term + vector for concept
qmd query $'lex: rate limiter\nvec: how does throttling work under load'

# With query expansion
qmd query $'expand: database migration plan\nlex: "schema change"'
```

### 検索語の書き方（lex / BM25 の場合） {#query-syntax-lexbm25-mode}

| 書き方 | はたらき | 例 |
|--------|--------|---------|
| `term` | 前方一致 | `perf` が "performance" に当たります |
| `"phrase"` | 完全に一致する言い回し | `"rate limiter"` |
| `-term` | その語を除く | `performance -sports` |

### HyDE（想定した答えから検索する） {#hyde-hypothetical-document-embeddings}

込み入った話題では、こういう答えが返ってくるはずだという文章を自分で書いてみてください:

```bash
qmd query $'hyde: The migration plan involves three phases. First, we add the new columns without dropping the old ones. Then we backfill data. Finally we cut over and remove legacy columns.'
```

### コレクションを絞る {#scoping-to-collections}

```bash
qmd search "query" --collection notes
qmd query "query" --collection project-docs
```

### 出力の形式 {#output-formats}

```bash
qmd search "query" --json        # JSON output (best for parsing)
qmd search "query" --limit 5     # Limit results
qmd get "#abc123"                # Get by document ID
qmd get "path/to/file.md"       # Get by file path
qmd get "file.md:50" -l 100     # Get specific line range
qmd multi-get "journals/*.md" --json  # Batch retrieve by glob
```

## MCP との連携（おすすめ） {#mcp-integration-recommended}

qmd は MCP サーバーを備えていて、Hermes Agent 本体の MCP クライアント経由で
検索のツールをそのまま渡せます。こちらが本命のつなぎ方で、いったん設定すれば、
この skill を読み込まなくてもエージェントが qmd のツールを自動で使えるようになります。

### 方法 A: stdio 方式（手軽） {#option-a-stdio-mode-simple}

`~/.hermes/config.yaml` に次を足します:

```yaml
mcp_servers:
  qmd:
    command: "qmd"
    args: ["mcp"]
    timeout: 30
    connect_timeout: 45
```

これで `mcp_qmd_search`、`mcp_qmd_vsearch`、
`mcp_qmd_deep_search`、`mcp_qmd_get`、`mcp_qmd_status` のツールが使えるようになります。

**引き換えになること:** 最初の検索でモデルが読み込まれます（冷えた状態から 19 秒ほど）。
そのあとはそのやり取りのあいだ温まったままです。たまに使う程度なら十分です。

### 方法 B: HTTP の常駐方式（速い。よく使う人向け） {#option-b-http-daemon-mode-fast-recommended-for-heavy-use}

qmd を常駐させて別に起動しておくと、モデルがメモリ上で温まったままになります:

```bash
# Start daemon (persists across agent restarts)
qmd mcp --http --daemon

# Runs on http://localhost:8181 by default
```

そのうえで、Hermes Agent から HTTP でつなぎます:

```yaml
mcp_servers:
  qmd:
    url: "http://localhost:8181/mcp"
    timeout: 30
```

**引き換えになること:** 動いているあいだ 2GB ほどのメモリを使いますが、
どの検索も速く終わります（2〜3 秒ほど）。よく検索する人にはこちらが向いています。

### 常駐させ続ける {#keeping-the-daemon-running}

#### macOS（launchd） {#macos-launchd}

```bash
cat > ~/Library/LaunchAgents/com.qmd.daemon.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.qmd.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>qmd</string>
    <string>mcp</string>
    <string>--http</string>
    <string>--daemon</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/qmd-daemon.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/qmd-daemon.log</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.qmd.daemon.plist
```

#### Linux（systemd のユーザーサービス） {#linux-systemd-user-service}

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/qmd-daemon.service << 'EOF'
[Unit]
Description=QMD MCP Daemon
After=network.target

[Service]
ExecStart=qmd mcp --http --daemon
Restart=on-failure
RestartSec=10
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now qmd-daemon
systemctl --user status qmd-daemon
```

### MCP ツールの一覧 {#mcp-tools-reference}

つながると、次のツールが `mcp_qmd_*` として使えます:

| MCP のツール | 対応するコマンド | 説明 |
|----------|---------|-------------|
| `mcp_qmd_search` | `qmd search` | BM25 によるキーワード検索 |
| `mcp_qmd_vsearch` | `qmd vsearch` | 意味に基づくベクトル検索 |
| `mcp_qmd_deep_search` | `qmd query` | ハイブリッド検索と並べ直し |
| `mcp_qmd_get` | `qmd get` | ID かパスで文書を取り出す |
| `mcp_qmd_status` | `qmd status` | 索引の状態と統計 |

MCP のツールは、やり方を組み合わせた検索のために JSON での指定も受け付けます:

```json
{
  "searches": [
    {"type": "lex", "query": "authentication middleware"},
    {"type": "vec", "query": "how user login is verified"}
  ],
  "collections": ["project-docs"],
  "limit": 10
}
```

## CLI で使う（MCP なし） {#cli-usage-without-mcp}

MCP を設定していないときは、端末から qmd を直接使います:

```
terminal(command="qmd query 'what was decided about the API redesign' --json", timeout=30)
```

準備や管理の作業では、いつも端末を使ってください:

```
terminal(command="qmd collection add ~/Documents/notes --name notes")
terminal(command="qmd context add qmd://notes 'Personal research notes and ideas'")
terminal(command="qmd embed")
terminal(command="qmd status")
```

## 検索の中で何が起きているか {#how-the-search-pipeline-works}

内側を知っておくと、どの検索を選べばいいか決めやすくなります:

1. **検索語の広げ直し** — 目的に合わせて調整した 1.7B のモデルが、別の言い方の
   検索語を 2 つ作ります。もとの検索語は統合時に 2 倍の重みを持ちます。
2. **同時に取りに行く** — BM25（SQLite FTS5）とベクトル検索が、
   すべての検索語について同時に走ります。
3. **RRF による統合** — Reciprocal Rank Fusion（k=60）が結果をまとめます。
   上位への上乗せ: 1 位は +0.05、2〜3 位は +0.02 です。
4. **LLM による並べ直し** — qwen3-reranker が上位 30 件を採点します（0.0〜1.0）。
5. **順位に応じた配合** — 1〜3 位は検索 75% / 並べ直し 25%。
   4〜10 位は 60/40。11 位以降は 40/60（下位ほど並べ直しを信じます）。

**賢い区切り方:** 文書は自然な切れ目（見出し、コードブロック、空行）で分割され、
900 トークンほどを目安に 15% を重ねます。コードブロックが
途中で切られることはありません。

## うまく使うこつ {#best-practices}

1. **説明は必ず書き添える** — `qmd context add` は検索の精度を大きく
   引き上げます。各コレクションの中身を説明してください。
2. **文書を足したら作り直す** — コレクションに新しいファイルを足したら、
   `qmd embed` をもう一度実行する必要があります。
3. **速さがほしいときは `qmd search`** — キーワードを素早く探したいとき
   （コード中の識別子、正確な名前）は、BM25 ならモデルなしですぐ結果が出ます。
4. **精度がほしいときは `qmd query`** — 概念的な問いや、いちばんよい結果が
   必要なときは、ハイブリッド検索を使ってください。
5. **MCP でのつなぎ方を優先する** — いったん設定すれば、この skill を
   毎回読み込まなくても、エージェントが本体のツールとして使えます。
6. **よく使うなら常駐方式** — 知識をためた場所を日常的に検索するなら、
   HTTP で常駐させる設定をすすめてください。
7. **組み合わせ検索では最初の検索語が 2 倍の重みを持つ** — lex と vec を
   組み合わせるときは、いちばん大事で確かな検索語を先に書いてください。

## 困ったとき {#troubleshooting}

### 「初回実行時にモデルが落ちてくる」 {#models-downloading-on-first-run}
これは正常です。qmd は初回に 2GB ほどの GGUF モデルを自動で取得します。
一度きりの処理です。

### 冷えた状態からの待ち時間（19 秒ほど） {#cold-start-latency-19s}
モデルがメモリに載っていないときに起こります。対処:
- HTTP の常駐方式（`qmd mcp --http --daemon`）で温めたままにします
- モデルが要らない場面では `qmd search`（BM25 のみ）を使います
- MCP の stdio 方式は最初の検索でモデルを読み込み、そのやり取りのあいだ温まったままです

### macOS で「unable to load extension」と出る {#macos-unable-to-load-extension}
Homebrew の SQLite を入れてください: `brew install sqlite`
そのうえで、システムの SQLite より先に PATH に来るようにします。

### 「No collections found」と出る {#no-collections-found}
`qmd collection add <path> --name <name>` でディレクトリを追加し、
そのあと `qmd embed` で索引を作ってください。

### 埋め込みモデルの差し替え（日中韓・多言語） {#embedding-model-override-cjkmultilingual}
英語以外の内容では、`QMD_EMBED_MODEL` の環境変数を設定してください:
```bash
export QMD_EMBED_MODEL="your-multilingual-model"
```

## データの保存先 {#data-storage}

- **索引とベクトル:** `~/.cache/qmd/index.sqlite`
- **モデル:** 初回の実行時に手元のキャッシュへ自動で落ちてきます
- **クラウドには頼りません** — すべて手元で動きます

## 参考 {#references}

- [GitHub: tobi/qmd](https://github.com/tobi/qmd)
- [QMD の変更履歴](https://github.com/tobi/qmd/blob/main/CHANGELOG.md)
