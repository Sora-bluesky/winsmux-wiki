---
title: "Here Now — {slug}.here.now にサイトを公開し、Drive にファイルを置く"
description: "{slug}.here.now にサイトを公開し、Drive にファイルを置く"
upstream_path: user-guide/skills/optional/productivity/productivity-here-now.md
upstream_blob: 4e41830d18f68159c03cb1804672210120d86c9f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-here-now
---

# Here Now {#here-now}

&#123;slug&#125;.here.now にサイトを公開し、Drive にファイルを置きます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/productivity/here-now` で入れます |
| パス | `optional-skills/productivity\here-now` |
| バージョン | `1.15.3` |
| 作者 | here.now |
| ライセンス | MIT |
| 対応プラットフォーム | macos, linux |
| タグ | `here.now`, `herenow`, `publish`, `deploy`, `hosting`, `static-site`, `web`, `share`, `URL`, `drive`, `storage` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# here.now {#herenow}

here.now は、エージェントが Web サイトを公開したり、非公開のファイルをクラウドの Drive に置いたりするためのサービスです。

here.now の役割は2つです。

- **サイト**: `{slug}.here.now` で Web サイトやファイルを公開します。
- **Drive**: エージェントの非公開ファイルをクラウドのフォルダに置きます。

## 最新のドキュメント {#current-docs}

**here.now でできること・機能・進め方について答える前に、最新のドキュメントを読んでください:**

→ **https://here.now/docs**

読むタイミング:

- 会話の中で here.now の話が最初に出たとき
- やり方を聞かれたとき
- 何ができるか、対応しているか、どれがおすすめかを聞かれたとき
- ある機能が使えないと伝える前に

ローカルの skill の文章だけでは足りず、最新のドキュメントが必要になる話題:

- Drive と Drive の共有
- 独自ドメイン
- 支払いと支払いによる制限
- fork
- プロキシのルートとサービス変数
- ハンドルとリンク
- 上限と割り当て
- SPA のルーティング
- エラーの扱いと復旧
- 機能が使えるかどうか

**ドキュメントと実際の API の挙動が食い違ったら、実際の挙動を正としてください。**

ドキュメントの取得に失敗したりタイムアウトしたりしたときは、ローカルの skill と実際の API・スクリプトの出力で進めてください。実際に動かす操作では、生きた API の挙動を優先します。

## 必要なもの {#requirements}

- 必要なバイナリ: `curl`, `file`, `jq`
- 任意の環境変数: `$HERENOW_API_KEY`
- 任意の Drive トークン変数: `$HERENOW_DRIVE_TOKEN`
- 任意の認証情報ファイル: `~/.herenow/credentials`
- skill の補助スクリプトの場所:
  - サイトの公開は `${HERMES_SKILL_DIR}/scripts/publish.sh`
  - 非公開の Drive 保存は `${HERMES_SKILL_DIR}/scripts/drive.sh`

## サイトを作る {#create-a-site}

```bash
PUBLISH="${HERMES_SKILL_DIR}/scripts/publish.sh"
bash "$PUBLISH" {file-or-dir} --client hermes
```

公開された URL が出力されます（例: `https://bright-canvas-a7k2.here.now/`）。

内部では、作成・更新 → ファイルのアップロード → 確定、という3段階で動きます。確定が成功するまで、サイトは公開されません。

API キーなしで実行すると、24 時間で消える**匿名サイト**になります。
API キーを保存してあれば、サイトはそのまま残ります。

**ファイルの置き方:** HTML のサイトなら、公開するディレクトリの直下に `index.html` を置きます。サブディレクトリの中ではありません。そのディレクトリの中身がサイトのルートになります。たとえば `my-site/index.html` があるなら、公開するのは `my-site/` であって、`my-site/` を含む親フォルダではありません。

HTML を一切使わず、素のファイルだけを公開することもできます。ファイルが1つなら、画像・PDF・動画・音声を見やすく表示するビューアが付きます。複数なら、フォルダを辿れる一覧と画像ギャラリーが自動で作られます。

## 既存のサイトを更新する {#update-an-existing-site}

```bash
PUBLISH="${HERMES_SKILL_DIR}/scripts/publish.sh"
bash "$PUBLISH" {file-or-dir} --slug {slug} --client hermes
```

匿名サイトを更新するとき、スクリプトは `.herenow/state.json` から `claimToken` を自動で読み込みます。上書きしたいときは `--claim-token {token}` を渡します。

サインイン済みでの更新には、保存済みの API キーが必要です。

## Drive を使う {#use-a-drive}

Drive は、エージェントのファイルを非公開でクラウドに置きたいときに使います。ドキュメント、文脈、記憶、計画、素材、メディア、調査結果、コードなど、Web サイトとして公開せずに残しておきたいものが対象です。

サインイン済みのアカウントには、`My Drive` という既定の Drive が必ずあります。

```bash
DRIVE="${HERMES_SKILL_DIR}/scripts/drive.sh"
bash "$DRIVE" default
bash "$DRIVE" ls "My Drive"
bash "$DRIVE" put "My Drive" notes/today.md --from ./notes/today.md
bash "$DRIVE" cat "My Drive" notes/today.md
bash "$DRIVE" share "My Drive" --perms write --prefix notes/ --ttl 7d
```

エージェント同士の受け渡しには、範囲を絞った Drive トークンを使います。`herenow_drive` の共有ブロックを受け取ったら、その `token` を `Authorization: Bearer <token>` として `api_base` に対して使い、`pathPrefix` があればそれを守り、書き込みでは ETag を保ってください。`pathPrefix` が `null` なら Drive 全体にアクセスできます。skill が使える状況なら `drive.sh` を優先し、そうでなければ挙げられている API 操作を直接呼びます。

## API キーの保存場所 {#api-key-storage}

公開スクリプトは、次の順に API キーを探し、最初に見つかったものを使います。

1. `--api-key {key}` フラグ（CI やスクリプト用。対話的な場面では避けます）
2. `$HERENOW_API_KEY` 環境変数
3. `~/.herenow/credentials` ファイル（エージェントにはこれがおすすめです）

キーを保存するには、認証情報ファイルに書き込みます:

```bash
mkdir -p ~/.herenow && echo "{API_KEY}" > ~/.herenow/credentials && chmod 600 ~/.herenow/credentials
```

**重要**: API キーを受け取ったら、すぐに保存します。上のコマンドは自分で実行してください。手で実行するよう頼んではいけません。対話中に `--api-key` などの CLI フラグでキーを渡すのは避けます。保存先は認証情報ファイルが基本です。

認証情報やローカルの状態ファイル（`~/.herenow/credentials`、`.herenow/state.json`）は、絶対にバージョン管理にコミットしないでください。

## API キーを取得する {#getting-an-api-key}

匿名（24 時間）から、消えないサイトに切り替えるには次のようにします。

1. メールアドレスを聞きます。
2. 一度きりのサインインコードを要求します:

```bash
curl -sS https://here.now/api/auth/agent/request-code \
  -H "content-type: application/json" \
  -d '{"email": "user@example.com"}'
```

3. 「here.now からサインインコードのメールが届いているので、ここに貼ってください」と伝えます。
4. コードを検証して API キーを受け取ります:

```bash
curl -sS https://here.now/api/auth/agent/verify-code \
  -H "content-type: application/json" \
  -d '{"email":"user@example.com","code":"ABCD-2345"}'
```

5. 返ってきた `apiKey` は自分で保存します（相手に頼んではいけません）:

```bash
mkdir -p ~/.herenow && echo "{API_KEY}" > ~/.herenow/credentials && chmod 600 ~/.herenow/credentials
```

## 状態ファイル {#state-file}

サイトの作成・更新のたびに、スクリプトは作業中のディレクトリの `.herenow/state.json` に書き込みます:

```json
{
  "publishes": {
    "bright-canvas-a7k2": {
      "siteUrl": "https://bright-canvas-a7k2.here.now/",
      "claimToken": "abc123",
      "claimUrl": "https://here.now/claim?slug=bright-canvas-a7k2&token=abc123",
      "expiresAt": "2026-02-18T01:00:00.000Z"
    }
  }
}
```

サイトを作ったり更新したりする前に、このファイルで以前の slug を調べてもかまいません。
ただし `.herenow/state.json` は、あくまで内部のキャッシュとして扱ってください。
このローカルのパスを URL として見せてはいけませんし、サインインの状態・期限・claim URL の正としても使わないでください。

## 相手に伝えること {#what-to-tell-the-user}

公開したサイトについて:

- そのとき実行したスクリプトが返した `siteUrl` を必ず伝えます。
- サインインの状態は、スクリプトの標準エラー出力にある `publish_result.*` の行を読んで判断します。
- `publish_result.auth_mode=authenticated` のときは、サイトが**消えずに残り**、アカウントに保存されたことを伝えます。claim URL は不要です。
- `publish_result.auth_mode=anonymous` のときは、サイトが**24 時間で消える**ことを伝えます。そのまま残せるように claim URL も渡します（`publish_result.claim_url` が空でなく、`https://` で始まる場合）。claim トークンは一度しか返らず、あとから取り戻せないことも伝えてください。
- claim URL やサインイン状態を調べるために `.herenow/state.json` を見るように案内してはいけません。

Drive について:

- Drive のファイルを公開 URL のように説明してはいけません。
- Drive の中身は、範囲を絞ったトークンで共有しない限り非公開だと伝えます。
- 別のエージェントに渡すときは、`pathPrefix` を狭く切って TTL を短くしたトークンを優先します。

## publish.sh のオプション {#publishsh-options}

| フラグ                   | 説明                                  |
| ---------------------- | -------------------------------------------- |
| `--slug {slug}`        | 新規作成ではなく既存サイトを更新する |
| `--claim-token {token}`| 匿名サイトの更新で claim トークンを上書きする    |
| `--title {text}`       | ビューアのタイトル（HTML 以外のサイト）             |
| `--description {text}` | ビューアの説明                            |
| `--ttl {seconds}`      | 期限を設定する（サインイン時のみ）               |
| `--client {name}`      | 表示用のエージェント名（例: `hermes`）    |
| `--base-url {url}`     | API のベース URL（既定: `https://here.now`）    |
| `--allow-nonherenow-base-url` | 既定以外の `--base-url` に認証情報を送ることを許可する |
| `--api-key {key}`      | API キーの上書き（認証情報ファイルを優先）    |
| `--spa`                | SPA ルーティングを有効にする（不明なパスに index.html を返す） |
| `--forkable`           | ほかの人がこのサイトを fork できるようにする                           |

## publish.sh の先へ {#beyond-publishsh}

Drive の操作には `drive.sh` か Drive API を使います。アカウントやサイトのより広い管理 — 削除、メタデータ、パスワード、支払い、ドメイン、ハンドル、リンク、変数、プロキシのルート、fork、複製など — については、最新のドキュメントを見てください:

→ **https://here.now/docs**

ドキュメント全文: https://here.now/docs
