---
title: "Hermes で MCP を使う"
description: "MCP サーバーを Hermes Agent につなぎ、公開するツールを絞り込み、実際の作業で安全に使うための実践ガイド"
upstream_path: guides/use-mcp-with-hermes.md
upstream_blob: 6b8eee4a5929b508b7bd80c5bdb3e2eda776986d
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes
---

# Hermes で MCP を使う {#use-mcp-with-hermes}

このガイドでは、日々の作業のなかで Hermes Agent と MCP を実際にどう使うかを説明します。

機能ページが「MCP とは何か」を説明するものだとすれば、こちらは「短時間で安全に価値を引き出す方法」の話です。

## MCP はどんなときに使うか {#when-should-you-use-mcp}

次のような場合に MCP を使います。

- 目的のツールがすでに MCP の形で存在していて、Hermes 用のネイティブなツールを作りたくない
- きれいな RPC の層を通して、ローカルやリモートのシステムを Hermes に操作させたい
- サーバーごとに、公開する範囲を細かく制御したい
- Hermes 本体に手を入れずに、社内の API・データベース・業務システムへつなぎたい

逆に、次のような場合は MCP を使わないでください。

- 組み込みの Hermes ツールで十分にうまく片付く
- サーバーが危険なツールを大量に公開していて、絞り込む準備ができていない
- ごく狭い連携が一つ必要なだけで、ネイティブなツールのほうが単純で安全に済む

## 考え方の基本 {#mental-model}

MCP はアダプタの層だと考えてください。

- Hermes はあくまでエージェント
- MCP サーバーがツールを提供する
- Hermes は起動時か再読み込み時にそれらのツールを見つける
- モデルは通常のツールと同じように使える
- 各サーバーをどこまで見せるかは利用者が決める

最後の点が重要です。よい MCP の使い方は「全部つなぐ」ことではなく、「必要なものを、役に立つ最小の範囲でつなぐ」ことです。

## ステップ 1: MCP のサポートを入れる {#step-1-install-mcp-support}

標準のインストールスクリプトで Hermes を入れたなら、MCP のサポートは最初から含まれています（インストーラが `uv pip install -e ".[all]"` を実行します）。

追加機能なしでインストールしていて、あとから MCP だけを足したい場合は次のようにします。

```bash
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"
```

npm ベースのサーバーを使うなら、Node.js と `npx` が使える状態にしておいてください。

Python 製の MCP サーバーの多くでは、`uvx` が扱いやすい選択肢になります。

## ステップ 2: まずは 1 台だけ追加する {#step-2-add-one-server-first}

安全なサーバーを 1 つだけ選んで始めます。

例として、プロジェクトのディレクトリ 1 つだけにアクセスできるファイルシステムのサーバーを挙げます。

```yaml
mcp_servers:
  project_fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/my-project"]
```

そのうえで Hermes を起動します。

```bash
hermes chat
```

ここで、具体的な内容を尋ねてみます。

```text
Inspect this project and summarize the repo layout.
```

## ステップ 3: MCP が読み込まれたか確認する {#step-3-verify-mcp-loaded}

確認する方法はいくつかあります。

- 設定が済んでいれば、Hermes のバナーやステータスに MCP の連携が表示されます
- どんなツールが使えるか Hermes に尋ねる
- 設定を変えたあとは `/reload-mcp` を使う
- サーバーへの接続に失敗した場合はログを確認する

実際に試すなら、次のようなプロンプトが役に立ちます。

```text
Tell me which MCP-backed tools are available right now.
```

## ステップ 4: すぐに絞り込みを始める {#step-4-start-filtering-immediately}

サーバーが多くのツールを公開している場合、絞り込みを後回しにしてはいけません。

### 例: 使いたいものだけを許可する {#example-whitelist-only-what-you-want}

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, search_code]
```

機微なシステムでは、たいていこれが最良の既定になります。

## WSL2: WSL の Hermes を Windows の Chrome につなぐ {#wsl2-bridge-hermes-in-wsl-to-windows-chrome}

次のような状況では、この構成が実用的です。

- Hermes を WSL2 の中で動かしている
- 操作したいブラウザが、Windows 側でふだんログインして使っている Chrome である
- WSL からだと `/browser connect` が扱いにくい、あるいは安定しない

この構成では、Hermes が Chrome に直接つなぐわけでは**ありません**。実際にはこうなります。

- Hermes は WSL で動く
- Hermes がローカルの stdio MCP サーバーを起動する
- その MCP サーバーは Windows との相互運用（`cmd.exe` や `powershell.exe`）を通じて起動される
- MCP サーバーが、実際に動いている Windows の Chrome セッションに接続する

図にすると次のとおりです。

```text
Hermes (WSL) -> MCP stdio bridge -> Windows Chrome
```

### この方式が役に立つ理由 {#why-this-mode-is-useful}

- Windows の本物のブラウザプロファイル、クッキー、ログイン状態をそのまま使える
- Hermes はサポート対象の Unix 環境（WSL2）に留まれる
- ブラウザ操作が、Hermes 本体のブラウザ転送に頼らず MCP のツールとして公開される

### おすすめのサーバー {#recommended-server}

`chrome-devtools-mcp` を使ってください。

Windows の Chrome で `chrome://inspect/#remote-debugging` からのリモートデバッグをすでに有効にしているなら、WSL 側から次のように追加します。

```bash
hermes mcp add chrome-devtools-win --command cmd.exe --args /c npx -y chrome-devtools-mcp@latest --autoConnect --no-usage-statistics
```

サーバーを保存したら、動作を確かめます。

```bash
hermes mcp test chrome-devtools-win
```

そのあと Hermes のセッションを新しく開始するか、次を実行します。

```text
/reload-mcp
```

### よくあるプロンプト {#typical-prompt}

読み込みが済めば、Hermes は MCP の接頭辞が付いたブラウザ用ツールをそのまま使えます。たとえば次のように書きます。

```text
调用 MCP 工具 mcp_chrome_devtools_win_list_pages，列出当前浏览器标签页。
```

### `/browser connect` が適さない場面 {#when-browser-connect-is-the-wrong-tool}

Hermes が WSL で、Chrome が Windows で動いている場合、Chrome が開いていてデバッグ可能な状態でも `/browser connect` は失敗することがあります。

よくある原因は次のとおりです。

- Chrome が Windows 側のツールに見せているホストローカルのエンドポイントへ、WSL からは届かない
- 新しい Chrome のライブデバッグの仕組みは、従来の `ws://localhost:9222` とは別物である
- `chrome-devtools-mcp` のような Windows 側の補助を経由したほうが、ブラウザに接続しやすい

そうした場合、`/browser connect` は同じ環境どうしの構成に使い、WSL から Windows のブラウザへ橋渡しするときは MCP を使ってください。

### 既知の落とし穴 {#known-pitfalls}

- MCP から Windows の stdio 実行ファイルを使うときは、`/mnt/c/Users/<you>` や `/mnt/c/workspace/...` のような Windows 側をマウントしたパスから Hermes を起動してください。
- `/root` や `/home/...` から Hermes を起動すると、MCP サーバーが立ち上がる前に Windows が `UNC` のカレントディレクトリに関する警告を出すことがあります。
- `chrome-devtools-mcp --autoConnect` がページの列挙中にタイムアウトする場合は、Chrome のバックグラウンドタブや凍結されたタブを減らしてから再試行してください。

### 例: 危険な操作を禁止する {#example-blacklist-dangerous-actions}

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer, refund_payment]
```

### 例: 補助的なラッパーも無効にする {#example-disable-utility-wrappers-too}

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: false
      resources: false
```

## 絞り込みは何に効くのか {#what-does-filtering-actually-affect}

Hermes が MCP 経由で公開する機能には、2 つの種類があります。

1. サーバー本来の MCP ツール
- 次で絞り込みます。
  - `tools.include`
  - `tools.exclude`

2. Hermes が追加する補助的なラッパー
- 次で絞り込みます。
  - `tools.resources`
  - `tools.prompts`

### 目にする補助ラッパー {#utility-wrappers-you-may-see}

リソース関連:
- `list_resources`
- `read_resource`

プロンプト関連:
- `list_prompts`
- `get_prompt`

これらのラッパーが現れるのは、次の両方が満たされたときだけです。
- 設定でそれを許可している
- MCP サーバーのセッションが実際にその機能に対応している

つまり Hermes は、サーバーが持っていないリソースやプロンプトを、あるかのように見せることはありません。

## よくある構成 {#common-patterns}

### 構成 1: ローカルのプロジェクト補助 {#pattern-1-local-project-assistant}

範囲を区切った作業場所について Hermes に考えさせたいときは、リポジトリ内のファイルシステムや git のサーバーを MCP でつなぎます。

```yaml
mcp_servers:
  fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/project"]

  git:
    command: "uvx"
    args: ["mcp-server-git", "--repository", "/home/user/project"]
```

相性のよいプロンプト:

```text
Review the project structure and identify where configuration lives.
```

```text
Check the local git state and summarize what changed recently.
```

### 構成 2: Open Scaffold でリポジトリに作業の記録を残す {#pattern-2-repo-native-work-record-with-open-scaffold}

リポジトリに残された AI の作業記録（ミッション、計画、証跡のメモ、引き継ぎ用の情報、レビューやゲートの結果）を Hermes に読ませたいときは、[Open Scaffold](https://github.com/graphanov/open-scaffold) を使います。Hermes はエージェントのまま、Open Scaffold はリポジトリの中の記録のままです。

足場を用意したリポジトリ 1 つについて、サーバーを追加します。

```bash
hermes mcp add open_scaffold --command npx --args -y open-scaffold@latest mcp serve --repo /absolute/path/to/repo
hermes mcp test open_scaffold
```

そのうえで、公開する範囲は読み取り中心に保ちます。`hermes mcp add` の対話で `select` を選ぶか、あとから `config.yaml` を編集してください。

```yaml
mcp_servers:
  open_scaffold:
    command: "npx"
    args: ["-y", "open-scaffold@latest", "mcp", "serve", "--repo", "/absolute/path/to/repo"]
    tools:
      include:
        - list_plans
        - get_plan
        - get_mission
        - list_evidence
        - get_evidence
        - get_status
        - search_plans
        - list_amendments
        - get_handoff
        - analyze_loop
        - gate_loop
      prompts: false
```

相性のよいプロンプト:

```text
Use the Open Scaffold MCP tools to compile the current handoff packet and tell me the next legal action.
```

```text
Inspect the active plans and evidence notes, then say whether this repo is ready for human review or needs another attempt.
```

境界についての注意:

- Open Scaffold の MCP は、既定ではローカル優先かつ読み取り専用です。
- 書き込み系のツールを使うには、サーバーを `--allow-write` 付きで起動する必要があります。Hermes に `.osc` のファイルを書き換えさせたいと明確に判断するまでは、有効にしないでください。
- Open Scaffold は作業を記録してゲートをかけるものであり、Hermes にマージ・公開・デプロイ・実行環境の起動を許可するものではありません。
- ツールのスキーマを再現可能にしたい場合は、`@latest` ではなく `open-scaffold@<version>` のように版を固定してください。

### 構成 3: GitHub の仕分け補助 {#pattern-3-github-triage-assistant}

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      prompts: false
      resources: false
```

相性のよいプロンプト:

```text
List open issues about MCP, cluster them by theme, and draft a high-quality issue for the most common bug.
```

```text
Search the repo for uses of _discover_and_register_server and explain how MCP tools are registered.
```

### 構成 4: 社内 API の補助 {#pattern-4-internal-api-assistant}

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      include: [list_customers, get_customer, list_invoices]
      resources: false
      prompts: false
```

相性のよいプロンプト:

```text
Look up customer ACME Corp and summarize recent invoice activity.
```

こうした用途こそ、除外リストより厳格な許可リストのほうがはるかに向いています。

### 構成 4: ドキュメントや知識のサーバー {#pattern-4-documentation-knowledge-servers}

MCP サーバーのなかには、直接の操作というより共有の知識資産に近いプロンプトやリソースを公開しているものがあります。

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: true
      resources: true
```

相性のよいプロンプト:

```text
List available MCP resources from the docs server, then read the onboarding guide and summarize it.
```

```text
List prompts exposed by the docs server and tell me which ones would help with incident response.
```

## チュートリアル: 絞り込みまで含めた一連の設定 {#tutorial-end-to-end-setup-with-filtering}

実際の進め方を順に見ていきます。

### 第 1 段階: GitHub の MCP を厳しい許可リスト付きで追加する {#phase-1-add-github-mcp-with-a-tight-whitelist}

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, search_code]
      prompts: false
      resources: false
```

Hermes を起動して、こう尋ねます。

```text
Search the codebase for references to MCP and summarize the main integration points.
```

### 第 2 段階: 必要になってから広げる {#phase-2-expand-only-when-needed}

あとから issue の更新も必要になったら、次のようにします。

```yaml
tools:
  include: [list_issues, create_issue, update_issue, search_code]
```

そして再読み込みします。

```text
/reload-mcp
```

### 第 3 段階: 方針の違う 2 台目を追加する {#phase-3-add-a-second-server-with-different-policy}

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      prompts: false
      resources: false

  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/project"]
```

これで Hermes は両方を組み合わせて動けます。

```text
Inspect the local project files, then create a GitHub issue summarizing the bug you find.
```

MCP の力が出るのはここです。Hermes 本体を変えずに、複数のシステムをまたぐ作業ができます。

## 安全に使うための指針 {#safe-usage-recommendations}

### 危険なシステムには許可リストを使う {#prefer-allowlists-for-dangerous-systems}

金銭に関わるもの、顧客に触れるもの、取り返しのつかない操作を含むものについては、次のようにします。
- `tools.include` を使う
- できるだけ小さな集合から始める

### 使わない補助機能は無効にする {#disable-unused-utilities}

サーバーが提供するリソースやプロンプトをモデルに見せたくないなら、切っておきます。

```yaml
tools:
  resources: false
  prompts: false
```

### サーバーの範囲は狭く保つ {#keep-servers-scoped-narrowly}

たとえば次のようにします。
- ファイルシステムのサーバーは、ホームディレクトリ全体ではなくプロジェクトのディレクトリ 1 つを起点にする
- git のサーバーはリポジトリ 1 つだけに向ける
- 社内 API のサーバーは、既定で読み取り中心のツールだけを公開する

### 設定を変えたら再読み込みする {#reload-after-config-changes}

```text
/reload-mcp
```

次のものを変えたあとに実行してください。
- include / exclude のリスト
- 有効・無効のフラグ
- resources / prompts の切り替え
- 認証ヘッダーや環境変数

## 症状別のトラブルシューティング {#troubleshooting-by-symptom}

### 「サーバーにはつながるが、期待したツールが出てこない」 {#the-server-connects-but-the-tools-i-expected-are-missing}

考えられる原因:
- `tools.include` で絞り込まれている
- `tools.exclude` で除外されている
- `resources: false` や `prompts: false` で補助ラッパーを無効にしている
- サーバーがそもそもリソースやプロンプトに対応していない

### 「設定はしたのに何も読み込まれない」 {#the-server-is-configured-but-nothing-loads}

確認する点:
- `enabled: false` が設定に残っていないか
- コマンドや実行環境（`npx`、`uvx` など）が存在するか
- HTTP のエンドポイントに到達できるか
- 認証用の環境変数やヘッダーが正しいか

### 「MCP サーバーが公開しているはずの数よりツールが少ないのはなぜ？」 {#why-do-i-see-fewer-tools-than-the-mcp-server-advertises}

Hermes が、サーバーごとの方針と対応状況を踏まえたうえでツールを登録するようになったからです。これは想定どおりの動きで、たいていは望ましい挙動です。

### 「設定を消さずに MCP サーバーを外すには？」 {#how-do-i-remove-an-mcp-server-without-deleting-the-config}

次のように書きます。

```yaml
enabled: false
```

設定は残したまま、接続と登録だけを止められます。

## 最初に試すとよい MCP の構成 {#recommended-first-mcp-setups}

多くの人にとって、最初に向いているサーバーは次のものです。
- ファイルシステム
- git
- GitHub
- fetch やドキュメント系の MCP サーバー
- 範囲を絞った社内 API を 1 つ

逆に、最初には向かないものは次のとおりです。
- 取り返しのつかない操作を多く含み、絞り込みもされていない大規模な業務システム
- 制約をかけられるほど自分が理解できていないもの

## 関連ドキュメント {#related-docs}

- [MCP（Model Context Protocol）](/hermes/docs/user-guide/features/mcp/)
- [FAQ](/hermes/docs/reference/faq/)
- [スラッシュコマンド](/hermes/docs/reference/slash-commands/)
