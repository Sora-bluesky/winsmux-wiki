---
title: "Gitnexus Explorer — コードベースの知識グラフを対話的な Web UI で見る"
description: "コードベースの知識グラフを対話的な Web UI で見る"
upstream_path: user-guide/skills/optional/research/research-gitnexus-explorer.md
upstream_blob: 7829a4432744ac0588d4f602517a80d2a0d19ffd
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-gitnexus-explorer
---

# Gitnexus Explorer {#gitnexus-explorer}

コードベースの知識グラフを、対話的な Web UI として立ち上げます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/research/gitnexus-explorer` で導入します |
| パス | `optional-skills/research\gitnexus-explorer` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent + Teknium |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `gitnexus`, `code-intelligence`, `knowledge-graph`, `visualization` |
| 関連 skill | [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/), [`codebase-inspection`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-codebase-inspection/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# GitNexus Explorer {#gitnexus-explorer}

任意のコードベースを知識グラフとして索引し、シンボル・呼び出しの連なり・クラスタ・実行の流れを
たどれる対話的な Web UI を立ち上げます。Cloudflare のトンネル経由で外からも見られます。

## 使いどころ {#when-to-use}

- コードベースの構造を目で見て把握したいとき
- リポジトリの知識グラフや依存グラフが欲しいと言われたとき
- 対話的なコードベース閲覧画面を誰かと共有したいとき

## 前提条件 {#prerequisites}

- **Node.js**（v18 以上） — GitNexus とプロキシに必要です
- **git** — 対象リポジトリに `.git` ディレクトリがあること
- **cloudflared** — トンネル用です（無ければ ~/.local/bin に自動で入ります）

## 規模についての注意 {#size-warning}

Web UI はすべてのノードをブラウザ側で描画します。5,000 ファイルほどまでのリポジトリなら快適です。
大きなリポジトリ（3 万ノード以上）は重くなるか、ブラウザのタブが落ちます。CLI と MCP のツールは
どんな規模でも動きます。この上限があるのは可視化だけです。

## 手順 {#steps}

### 1. GitNexus を clone してビルドする（初回のみ） {#1-clone-and-build-gitnexus-one-time-setup}

```bash
GITNEXUS_DIR="${GITNEXUS_DIR:-$HOME/.local/share/gitnexus}"

if [ ! -d "$GITNEXUS_DIR/gitnexus-web/dist" ]; then
  git clone https://github.com/abhigyanpatwari/GitNexus.git "$GITNEXUS_DIR"
  cd "$GITNEXUS_DIR/gitnexus-shared" && npm install && npm run build
  cd "$GITNEXUS_DIR/gitnexus-web" && npm install
fi
```

### 2. 外から見られるように Web UI に手を入れる {#2-patch-the-web-ui-for-remote-access}

Web UI は API の呼び先が `localhost:4747` になっています。トンネルやプロキシ越しでも動くよう、
同一オリジンを使うように書き換えます。

**対象ファイル: `$GITNEXUS_DIR/gitnexus-web/src/config/ui-constants.ts`**
次の行を:
```typescript
export const DEFAULT_BACKEND_URL = 'http://localhost:4747';
```
こう変えます:
```typescript
export const DEFAULT_BACKEND_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:4747';
```

**対象ファイル: `$GITNEXUS_DIR/gitnexus-web/vite.config.ts`**
`server: { }` ブロックの中に `allowedHosts: true` を足します（本番ビルドではなく dev モードで
動かす場合にだけ必要です）:
```typescript
server: {
    allowedHosts: true,
    // ... existing config
},
```

そのうえで本番用のバンドルをビルドします:
```bash
cd "$GITNEXUS_DIR/gitnexus-web" && npx vite build
```

### 3. 対象のリポジトリを索引する {#3-index-the-target-repo}

```bash
cd /path/to/target-repo
npx gitnexus analyze --skip-agents-md
rm -rf .claude/    # remove Claude Code-specific artifacts
```

意味的な検索も使いたいなら `--embeddings` を付けます（秒ではなく分単位で時間がかかります）。

索引はリポジトリ内の `.gitnexus/` に置かれます（自動で gitignore されます）。

### 4. プロキシのスクリプトを作る {#4-create-the-proxy-script}

次の内容をファイルに書きます（たとえば `$GITNEXUS_DIR/proxy.mjs`）。本番ビルドした Web UI を配信し、
`/api/*` を GitNexus のバックエンドへ中継します。同一オリジンなので CORS の問題は起きず、sudo も
nginx も要りません。

```javascript

const API_PORT = parseInt(process.env.API_PORT || '4747');
const DIST_DIR = process.argv[2] || './dist';
const PORT = parseInt(process.argv[3] || '8888');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.wasm': 'application/wasm',
};

function proxyToApi(req, res) {
  const opts = {
    hostname: '127.0.0.1', port: API_PORT,
    path: req.url, method: req.method, headers: req.headers,
  };
  const proxy = http.request(opts, (upstream) => {
    res.writeHead(upstream.statusCode, upstream.headers);
    upstream.pipe(res, { end: true });
  });
  proxy.on('error', () => { res.writeHead(502); res.end('Backend unavailable'); });
  req.pipe(proxy, { end: true });
}

function serveStatic(req, res) {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(filePath)) filePath = path.join(DIST_DIR, 'index.html');
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api')) proxyToApi(req, res);
  else serveStatic(req, res);
}).listen(PORT, () => console.log(`GitNexus proxy on http://localhost:${PORT}`));
```

### 5. サービスを起動する {#5-start-the-services}

```bash
# Terminal 1: GitNexus backend API
npx gitnexus serve &

# Terminal 2: Proxy (web UI + API on one port)
node "$GITNEXUS_DIR/proxy.mjs" "$GITNEXUS_DIR/gitnexus-web/dist" 8888 &
```

確認: `curl -s http://localhost:8888/api/repos` を叩くと、索引済みのリポジトリが返るはずです。

### 6. Cloudflare でトンネルする（任意 — 外から見たいとき） {#6-tunnel-with-cloudflare-optional-for-remote-access}

```bash
# Install cloudflared if needed (no sudo)
if ! command -v cloudflared &>/dev/null; then
  mkdir -p ~/.local/bin
  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o ~/.local/bin/cloudflared
  chmod +x ~/.local/bin/cloudflared
  export PATH="$HOME/.local/bin:$PATH"
fi

# Start tunnel (--config /dev/null avoids conflicts with existing named tunnels)
cloudflared tunnel --config /dev/null --url http://localhost:8888 --no-autoupdate --protocol http2
```

トンネルの URL（たとえば `https://random-words.trycloudflare.com`）は標準エラー出力に表示されます。
これを渡せば、リンクを知っている人は誰でもグラフを見られます。

### 7. 後片付け {#7-cleanup}

```bash
# Stop services
pkill -f "gitnexus serve"
pkill -f "proxy.mjs"
pkill -f cloudflared

# Remove index from the target repo
cd /path/to/target-repo
npx gitnexus clean
rm -rf .claude/
```

## つまずきやすい点 {#pitfalls}

- **cloudflared には `--config /dev/null` が要ります**。`~/.cloudflared/config.yml` に名前付き
  トンネルの設定がある場合は必須です。付けないと、その設定の受け皿になっている ingress ルールが
  クイックトンネルへのリクエストをすべて 404 にしてしまいます。

- **トンネルするなら本番ビルドが必須です。** Vite の dev サーバーは既定で localhost 以外の
  ホストを弾きます（`allowedHosts`）。本番ビルドと Node のプロキシを使えば、この問題はそもそも
  起きません。

- **`.claude/` や `CLAUDE.md` を作るのは Web UI ではありません。** これらは
  `npx gitnexus analyze` が作ります。markdown ファイルを抑えるには `--skip-agents-md` を付け、
  残りは `rm -rf .claude/` で消してください。Claude Code 向けの連携用なので、hermes-agent の
  利用者には不要です。

- **ブラウザのメモリ上限。** Web UI はグラフ全体をブラウザのメモリに読み込みます。5,000 ファイルを
  超えるリポジトリは重くなり、3 万ファイル超ではタブが落ちる可能性が高いです。

- **埋め込みは任意です。** `--embeddings` を付けると意味的な検索ができますが、大きなリポジトリでは
  数分かかります。ざっと見たいだけなら省き、AI チャットパネルから自然言語で問い合わせたいときに
  付けてください。

- **複数のリポジトリ。** `gitnexus serve` は索引済みのリポジトリをすべて配信します。いくつか索引して
  serve を一度起動すれば、Web UI 上で切り替えられます。
