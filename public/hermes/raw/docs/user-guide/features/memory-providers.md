---
title: "メモリープロバイダー"
description: "外部メモリープロバイダーのプラグイン — Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover、Supermemory"
upstream_path: user-guide/features/memory-providers.md
upstream_blob: 099d73b3ebeb0dcd87bd3eda3b0eba95a0d3dff2
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers
---

# メモリープロバイダー {#memory-providers}

Hermes Agent には外部メモリープロバイダーのプラグインが 8 つ同梱されていて、組み込みの MEMORY.md や USER.md を超えて、セッションをまたいで残る知識をエージェントに持たせられます。同時に有効にできる外部プロバイダーは **1 つだけ**です。組み込みのメモリーはその横で常に動いています。

## クイックスタート {#quick-start}

```bash
hermes memory setup      # interactive picker + configuration
hermes memory status     # check what's active
hermes memory off        # disable external provider
```

有効にするメモリープロバイダーは、`hermes plugins` → Provider Plugins → Memory Provider からも選べます。

`~/.hermes/config.yaml` に直接書いても構いません。

```yaml
memory:
  provider: openviking   # or honcho, mem0, hindsight, holographic, retaindb, byterover, supermemory
```

## しくみ {#how-it-works}

メモリープロバイダーが有効なとき、Hermes は次の処理を自動で行います。

1. **プロバイダーの持つ情報をシステムプロンプトに差し込む**（そのプロバイダーが知っていること）
2. **各ターンの前に関連するメモリーを先読みする**（バックグラウンドで動き、処理は止めません）
3. **応答のたびに会話のやり取りをプロバイダーへ送る**
4. **セッション終了時にメモリーを抽出する**（対応しているプロバイダーの場合）
5. **組み込みメモリーへの書き込みを外部プロバイダーにも反映する**
6. **プロバイダー固有のツールを追加する**（エージェントがメモリーを検索・保存・管理できるようになります）

組み込みのメモリー（MEMORY.md / USER.md）はこれまでどおり動きます。外部プロバイダーはそこに足すものです。

## 選べるプロバイダー {#available-providers}

### Honcho {#honcho}

対話的な推論、セッション単位の文脈の差し込み、意味検索、そして残り続ける結論を備えた、AI 前提のセッション横断ユーザーモデリングです。基本となる文脈には、ユーザー表現とピアカードに加えてセッションの要約も入るようになり、エージェントはすでに話した内容を把握できます。

| | |
|---|---|
| **向いている用途** | セッションをまたぐ文脈が必要なマルチエージェント構成、ユーザーとエージェントのすり合わせ |
| **必要なもの** | `pip install honcho-ai` と [API キー](https://app.honcho.dev)、または自前で立てたインスタンス |
| **データの保存先** | Honcho Cloud または自前サーバー |
| **費用** | Honcho の料金（クラウド）／無料（自前サーバー） |

**ツール（5 個）:** `honcho_profile`（ピアカードの読み取り・更新）、`honcho_search`（意味検索）、`honcho_context`（セッションの文脈 — 要約、ユーザー表現、カード、メッセージ）、`honcho_reasoning`（LLM がまとめたもの）、`honcho_conclude`（結論の作成・削除）

**構成:** 文脈は 2 層で差し込まれます。基本層（セッション要約 + ユーザー表現 + ピアカード。`contextCadence` の間隔で更新）と、対話的推論による追加分（LLM の推論。`dialecticCadence` の間隔で更新）です。対話的推論は、基本層の文脈があるかどうかを見て、コールドスタート用のプロンプト（ユーザーの一般的な事実）とウォーム用のプロンプト（セッション単位の文脈）を自動で選び分けます。

**独立した 3 つの設定つまみ**が、費用と深さをそれぞれ別に決めます。

- `contextCadence` — 基本層を更新する間隔（API 呼び出しの頻度）
- `dialecticCadence` — 対話的推論の LLM が動く間隔（LLM 呼び出しの頻度）
- `dialecticDepth` — 1 回の対話的推論で `.chat()` を何回通すか（1〜3、推論の深さ）

自動で差し込まれる対話的推論は、問い合わせの長さに応じて推論レベルも上げます（長い問い合わせほど深くなり、`reasoningLevelCap` が上限になります）。[問い合わせに応じた推論レベル](/hermes/docs/user-guide/features/honcho/#query-adaptive-reasoning-level)を参照してください。

**セットアップウィザード:**
```bash
hermes memory setup        # select "honcho" — runs the Honcho-specific post-setup
```

以前からある `hermes honcho setup` コマンドも今なお動きます（内部で `hermes memory setup` に転送されます）が、これは Honcho を有効なメモリープロバイダーに選んだあとでしか登録されません。

**画面のない端末やリモート環境:** ブラウザーのない環境（SSH 越し、リモート VM）でクラウド認証をするときは、ウィザードの認証方法の質問で **device** を選んでください。CLI が短いコードと確認用のリンクを表示するので、別の端末のブラウザーでそのリンクを開いて承認すれば設定が完了します。API キーを写す作業は要りません。使えるローカルブラウザーが見つからないとき、ウィザードは自動でこの選択肢を既定にします。

**設定ファイル:** `$HERMES_HOME/honcho.json`（プロファイル単位）または `~/.honcho/config.json`（全体）。読み込む順番は `$HERMES_HOME/honcho.json` > `~/.hermes/honcho.json` > `~/.honcho/config.json` です。[設定の一覧](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/honcho/README.md)と [Honcho の連携ガイド](https://docs.honcho.dev/v3/guides/integrations/hermes)も参照してください。

<details>
<summary>設定の全一覧</summary>

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `apiKey` | -- | [app.honcho.dev](https://app.honcho.dev) で発行する API キー |
| `baseUrl` | -- | 自前で立てた Honcho のベース URL |
| `peerName` | -- | ユーザー側のピアの名前 |
| `aiPeer` | host key | AI 側のピアの名前（プロファイルごとに 1 つ） |
| `workspace` | host key | 共有するワークスペースの ID |
| `contextTokens` | `null` (uncapped) | 1 ターンあたりに自動で差し込む文脈のトークン上限。単語の切れ目で切り詰めます |
| `contextCadence` | `1` | `context()` の API 呼び出しの最小間隔（基本層の更新） |
| `dialecticCadence` | `2` | `peer.chat()` の LLM 呼び出しの最小間隔。1〜5 を推奨。`hybrid`／`context` モードのみ有効 |
| `dialecticDepth` | `1` | 1 回の対話的推論で `.chat()` を通す回数。1〜3 に丸められます。0 回目はコールド／ウォームのプロンプト、1 回目は自己点検、2 回目は突き合わせ |
| `dialecticDepthLevels` | `null` | 各回の推論レベルを並べた配列（任意）。例: `["minimal", "low", "medium"]`。比率で決まる既定値を上書きします |
| `dialecticReasoningLevel` | `'low'` | 基準となる推論レベル: `minimal`、`low`、`medium`、`high`、`max` |
| `dialecticDynamic` | `true` | `true` なら、モデルがツールの引数で呼び出しごとに推論レベルを上書きできます |
| `dialecticMaxChars` | `600` | システムプロンプトに差し込む対話的推論の結果の最大文字数 |
| `recallMode` | `'hybrid'` | `hybrid`（自動の差し込み + ツール）、`context`（差し込みのみ）、`tools`（ツールのみ） |
| `writeFrequency` | `'async'` | メッセージを書き出すタイミング: `async`（バックグラウンドのスレッド）、`turn`（同期）、`session`（終了時にまとめて）、または整数 N |
| `saveMessages` | `true` | メッセージを Honcho API に保存するかどうか |
| `observationMode` | `'directional'` | `directional`（すべて有効）または `unified`（共有プール）。`observation` オブジェクトで上書きできます |
| `messageMaxChars` | `25000` | 1 メッセージあたりの最大文字数（超えると分割されます） |
| `dialecticMaxInputChars` | `10000` | `peer.chat()` に渡す対話的推論の入力の最大文字数 |
| `sessionStrategy` | `'per-directory'` | `per-directory`、`per-repo`、`per-session`、`global` |
| `pinUserPeer` | `false` | ゲートウェイ専用。`true` にすると、エージェント以外のゲートウェイ利用者はすべて `peerName` にまとめられます。この固定はすべての別名より優先されます |
| `userPeerAliases` | `{}` | ゲートウェイ専用。実行時の ID をピアに対応づけます（`{"7654321": "alice"}`）。複数を 1 つにまとめられます |
| `runtimePeerPrefix` | `""` | ゲートウェイ専用。別名に当てはまらない実行時 ID に名前空間を付けます（`telegram_7654321`） |

</details>

<details>
<summary>最小限の honcho.json（クラウド）</summary>

```json
{
  "apiKey": "your-key-from-app.honcho.dev",
  "hosts": {
    "hermes": {
      "enabled": true,
      "aiPeer": "hermes",
      "peerName": "your-name",
      "workspace": "hermes"
    }
  }
}
```

</details>

<details>
<summary>最小限の honcho.json（自前サーバー）</summary>

```json
{
  "baseUrl": "http://localhost:8000",
  "hosts": {
    "hermes": {
      "enabled": true,
      "aiPeer": "hermes",
      "peerName": "your-name",
      "workspace": "hermes"
    }
  }
}
```

</details>

:::tip `hermes honcho` からの移行
以前 `hermes honcho setup` を使っていた場合、設定もサーバー側のデータもそのまま残っています。セットアップウィザードからもう一度有効にするか、`memory.provider: honcho` を手で書けば、新しいしくみで動き出します。
:::

**複数ピアの設定:**

Honcho は会話を、ピア同士がメッセージをやり取りするものとして扱います。Hermes のプロファイル 1 つにつき、ユーザー側のピアが 1 つと AI 側のピアが 1 つあり、すべてが同じワークスペースを共有します。ワークスペースは共有の場で、ユーザー側のピアはプロファイルをまたいで共通、AI 側のピアはそれぞれ独立した人格です。AI 側のピアはそれぞれ自分の観測だけから表現とカードを作るので、`coder` プロファイルはコード寄りのまま、`writer` プロファイルは文章寄りのまま、同じユーザーに向き合えます。

対応関係は次のとおりです。

| 用語 | 内容 |
|---------|-----------|
| **Workspace** | 共有の場。同じワークスペースにある Hermes のプロファイルは、同じユーザー像を見ます。 |
| **User peer**（`peerName`） | 人間のほう。ワークスペース内のプロファイル間で共有されます。 |
| **AI peer**（`aiPeer`） | Hermes のプロファイルごとに 1 つ。ホストキー `hermes` が既定、それ以外は `hermes.<profile>` になります。 |
| **Observation** | ピアごとの切り替えで、誰のメッセージから何をモデル化するかを決めます。`directional`（既定、4 つすべて有効）または `unified`（観測者を 1 つにまとめたプール）。 |

### 新しいプロファイルに新しい Honcho ピアを作る {#new-profile-fresh-honcho-peer}

```bash
hermes profile create coder --clone
```

`--clone` を付けると、`honcho.json` に `hermes.coder` のホストブロックが作られ、`aiPeer: "coder"`、共有の `workspace`、引き継いだ `peerName`、`recallMode`、`writeFrequency`、`observation` などが入ります。AI 側のピアは先に Honcho 上へ作られるので、最初のメッセージの前から存在します。

### 既存のプロファイルに Honcho ピアを後から足す {#existing-profiles-backfill-honcho-peers}

```bash
hermes honcho sync
```

Hermes のプロファイルをすべて調べ、ホストブロックのないプロファイルにはそれを作り、既定の `hermes` ブロックから設定を引き継いで、新しい AI ピアを先に作ります。何度実行しても結果は同じで、すでにホストブロックがあるプロファイルは飛ばします。

### プロファイルごとの観測設定 {#per-profile-observation}

ホストブロックごとに観測の設定を個別に上書きできます。たとえば、AI 側のピアがユーザーを観測しつつ自分自身はモデル化しない、コード寄りのプロファイルは次のようになります。

```json
"hermes.coder": {
  "aiPeer": "coder",
  "observation": {
    "user": { "observeMe": true, "observeOthers": true },
    "ai":   { "observeMe": false, "observeOthers": true }
  }
}
```

**観測の切り替え（ピアごとに 1 組）:**

| 切り替え | 効果 |
|--------|--------|
| `observeMe` | Honcho がこのピア自身のメッセージからこのピアの表現を作ります |
| `observeOthers` | このピアが相手のピアのメッセージを観測します（ピアをまたいだ推論の材料になります） |

`observationMode` による組み合わせは次のとおりです。

- **`"directional"`**（既定） — 4 つのフラグがすべて有効。互いを完全に観測し、ピアをまたいだ対話的推論ができます。
- **`"unified"`** — ユーザーは `observeMe: true`、AI は `observeOthers: true`、残りは無効。観測者を 1 つにまとめたプールで、AI はユーザーをモデル化しますが自分自身はモデル化せず、ユーザー側のピアは自分だけをモデル化します。

[Honcho のダッシュボード](https://app.honcho.dev)で設定したサーバー側の切り替えは、手元の既定値より優先され、セッションの開始時に取り込まれます。

観測の詳しい説明は [Honcho のページ](/hermes/docs/user-guide/features/honcho/#observation-directional-vs-unified)にあります。

### ゲートウェイでの識別子の対応づけ {#gateway-identity-mapping}

ここまでのピアの考え方は CLI、TUI、デスクトップのセッションに当てはまり、どの会話も `peerName` に行き着きます。[ゲートウェイ](/hermes/docs/developer-guide/gateway-internals/)ではもう 1 つの軸が加わります。利用者はプラットフォーム固有の実行時 ID（Telegram の UID、Discord の snowflake、Slack のユーザー）を持ってやって来るので、3 つのキーがどの ID をどのピアに行き着かせるかを決めます。

| キー | 効果 |
|-----|--------|
| `pinUserPeer: true` | エージェント以外のゲートウェイ利用者がすべて `peerName` にまとめられます。この固定は最初に判定されるのですべての別名より優先されます。ユーザー側に独自のピアが要らないときだけ選んでください |
| `userPeerAliases` | 特定の実行時 ID をピアに対応づけます（`{"7654321": "alice"}`）。別々の人格を振り分けたいときはここに書きます。それぞれ自分のピアを持つエージェントも同じです |
| `runtimePeerPrefix` | 対応づけのない実行時 ID に名前空間を付け（`telegram_7654321`）、似た形の ID を持つプラットフォーム同士がぶつからないようにします |

ゲートウェイを使っていなければ、これらのキーは何もしません。`hermes memory setup` は、つながっているゲートウェイのプラットフォームを見つけたときだけこれらを尋ねます。解決の順序と設定の流れは [Honcho のページ](/hermes/docs/user-guide/features/honcho/#gateway-identity-mapping)にあります。

<details>
<summary>honcho.json の全体例（複数プロファイル）</summary>

```json
{
  "apiKey": "your-key",
  "workspace": "hermes",
  "peerName": "eri",
  "hosts": {
    "hermes": {
      "enabled": true,
      "aiPeer": "hermes",
      "workspace": "hermes",
      "peerName": "eri",
      "recallMode": "hybrid",
      "writeFrequency": "async",
      "sessionStrategy": "per-directory",
      "observation": {
        "user": { "observeMe": true, "observeOthers": true },
        "ai": { "observeMe": true, "observeOthers": true }
      },
      "dialecticReasoningLevel": "low",
      "dialecticDynamic": true,
      "dialecticCadence": 2,
      "dialecticDepth": 1,
      "dialecticMaxChars": 600,
      "contextCadence": 1,
      "messageMaxChars": 25000,
      "saveMessages": true
    },
    "hermes.coder": {
      "enabled": true,
      "aiPeer": "coder",
      "workspace": "hermes",
      "peerName": "eri",
      "recallMode": "tools",
      "observation": {
        "user": { "observeMe": true, "observeOthers": false },
        "ai": { "observeMe": true, "observeOthers": true }
      }
    },
    "hermes.writer": {
      "enabled": true,
      "aiPeer": "writer",
      "workspace": "hermes",
      "peerName": "eri"
    }
  },
  "sessions": {
    "/home/user/myproject": "myproject-main"
  }
}
```

</details>

[設定の一覧](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/honcho/README.md)と [Honcho の連携ガイド](https://docs.honcho.dev/v3/guides/integrations/hermes)も参照してください。

---

### OpenViking {#openviking}

Volcengine（ByteDance）による文脈データベースです。ファイルシステムのような階層で知識を持ち、段階的に読み出し、メモリーを 6 種類へ自動で振り分けます。

| | |
|---|---|
| **向いている用途** | 構造をたどって見られる、自前で持つ知識管理 |
| **必要なもの** | OpenViking の初期化・検証が済み、動いていること |
| **データの保存先** | 自前（手元またはクラウド） |
| **費用** | 無料（オープンソース、AGPL-3.0） |

**ツール（6 個）:** `viking_search`（意味検索）、`viking_read`（段階的に読む: 要旨／概要／全文）、`viking_browse`（ファイルシステム風の移動）、`viking_remember`（事実の保存）、`viking_forget`（`viking://` の URI を正確に指定してメモリーファイルを削除）、`viking_add_resource`（URL や文書の取り込み）

**設定:**
```bash
# Prepare OpenViking first
openviking-server init
openviking-server doctor
openviking-server

# Then configure Hermes
hermes memory setup    # select "openviking"
# Or manually:
hermes config set memory.provider openviking
```

`hermes memory setup` は、`~/.openviking/ovcli.conf` にある接続情報をそのまま使ったり、
コピーしたりできます。手で設定する場合は、有効なプロファイルの `.env` ファイルを使います。
既定のプロファイルなら `~/.hermes/.env`、名前付きのプロファイルなら
`~/.hermes/profiles/<profile>/.env` です。

```text
OPENVIKING_ENDPOINT=http://127.0.0.1:1933
# OPENVIKING_API_KEY=...
# OPENVIKING_ACCOUNT=default
# OPENVIKING_USER=default
# OPENVIKING_AGENT=hermes
```

OpenViking サーバー側の設定は `ov.conf`（`--config`、
`OPENVIKING_CONFIG_FILE`、または `~/.openviking/ov.conf`）にあります。クライアント側の接続情報は
`ovcli.conf`（`OPENVIKING_CLI_CONFIG_FILE` または
`~/.openviking/ovcli.conf`）にあります。

**主な特徴:**
- 段階的な文脈の読み込み: L0（約 100 トークン）→ L1（約 2k）→ L2（全文）
- セッションの確定時にメモリーを自動で抽出（プロフィール、好み、対象、出来事、事例、傾向）
- 知識を階層でたどるための `viking://` URI

`OPENVIKING_ACCOUNT` と `OPENVIKING_USER` は、手元・信頼済みのモードで使われます。
`OPENVIKING_AGENT` は OpenViking のなかでの Hermes のピア ID で、ピア単位のメモリーに使われます。

---

### Mem0 {#mem0}

サーバー側で LLM が事実を抽出し、意味検索・再ランク付け・重複の自動除去まで行います。つなぎ方は 3 通りあります。**Platform**（Mem0 Cloud）、**自前のダッシュボード**（Docker で自分が動かす Mem0 サーバー）、**OSS**（自分の LLM とベクトルストアを使い、Mem0 をプロセス内で動かす）です。

| | |
|---|---|
| **向いている用途** | 手をかけないメモリー管理 — 抽出は Mem0 が自動でやります |
| **必要なもの** | `pip install mem0ai` と API キー（platform）、動いている Mem0 サーバー（自前のダッシュボード）、あるいは LLM とベクトルストア（OSS） |
| **データの保存先** | Mem0 Cloud（platform）、自分の Mem0 サーバー（自前のダッシュボード）、プロセス内（OSS） |
| **費用** | Mem0 の料金（platform）／無料（自前サーバーまたは OSS） |

**ツール（4 個）:** `mem0_search`（意味検索。platform モードでは再ランク付けも選べます。既定は無効）、`mem0_add`（事実をそのまま保存）、`mem0_update`（ID を指定して更新）、`mem0_delete`（ID を指定して削除）

**設定（Platform）:**
```bash
hermes memory setup    # select "mem0" → "Platform"
# Or manually:
hermes config set memory.provider mem0
echo "MEM0_API_KEY=your-key" >> ~/.hermes/.env
```

**設定（OSS）:**
```bash
hermes memory setup    # select "mem0" → "Open Source (self-hosted)"
# Or via flags:
hermes memory setup mem0 --mode oss --oss-llm openai --oss-llm-key sk-... --oss-vector qdrant
```

ファイルを書かずに内容だけ確かめるには、次を実行します。
```bash
hermes memory setup mem0 --mode oss --oss-llm-key sk-... --dry-run
```

**設定（自前のダッシュボード）:** Docker で自分が動かす Mem0 サーバー（ダッシュボードの REST API）につなぎます。

```bash
hermes memory setup    # select "mem0" → "Self-hosted server"
# Or via flags:
hermes memory setup mem0 --mode selfhosted --host http://localhost:8888 --api-key your-admin-api-key
```

手で設定することもできます。環境変数として書く場合は次のとおりです。

```bash
echo "MEM0_HOST=http://localhost:8888" >> ~/.hermes/.env
echo "MEM0_API_KEY=your-admin-api-key" >> ~/.hermes/.env
```

`mem0.json` に書く場合は次のとおりです。

```json
{ "host": "http://localhost:8888", "api_key": "your-admin-api-key" }
```

このプラグインは `X-API-Key` で認証し、サーバーの `/search` と `/memories` のルートを使います。`api_key` は任意です（省いてよいのは `AUTH_DISABLED` のサーバーだけです）。`mode: oss` は設定しないでください。`host` より優先されてしまいます。

**設定ファイル:** `$HERMES_HOME/mem0.json`（振る舞いの設定）。`~/.hermes/.env` に置くのは秘密情報である `MEM0_API_KEY` だけです。

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `mode` | `platform` | `platform`（Mem0 Cloud）または `oss`（自分で動かす、プロセス内） |
| `host` | — | 自前の Mem0 サーバーの URL（Docker のダッシュボード）。`X-API-Key` を付けて HTTP でやり取りします。`mode: oss` と一緒に使わないでください |
| `user_id` | `hermes-user` | ユーザーの識別子 |
| `agent_id` | `hermes` | エージェントの識別子 |
| `rerank` | `false` | 検索結果を関連度で並べ直します（platform モードのみ） |

**OSS で使えるもの:**

| 部品 | 対応 |
|-----------|-----------|
| LLM | openai, ollama |
| Embedder | openai, ollama |
| Vector Store | qdrant (local/server), pgvector |

**モードを切り替える:** `hermes memory setup mem0 --mode <platform|selfhosted|oss>` をもう一度実行するか、`mem0.json` を直接書き換えます。

---

### Hindsight {#hindsight}

知識グラフ、対象の名寄せ、複数の方法を組み合わせた検索を備えた長期メモリーです。`hindsight_reflect` ツールはメモリー同士をつないでまとめるもので、ほかのプロバイダーにはありません。ツール呼び出しを含む会話のやり取りを丸ごと自動で保持し、セッション単位で文書として追跡します。

| | |
|---|---|
| **向いている用途** | 対象同士の関係をたどる、知識グラフによる想起 |
| **必要なもの** | クラウド: [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) の API キー。ローカル: LLM の API キー（OpenAI、Groq、OpenRouter など） |
| **データの保存先** | Hindsight Cloud、または手元に組み込んだ PostgreSQL |
| **費用** | Hindsight の料金（クラウド）または無料（ローカル） |

**ツール:** `hindsight_retain`（対象を抜き出して保存）、`hindsight_recall`（複数の方法での検索）、`hindsight_reflect`（メモリー同士をつないでまとめる）

**設定:**
```bash
hermes memory setup    # select "hindsight"
# Or manually:
hermes config set memory.provider hindsight
echo "HINDSIGHT_API_KEY=your-key" >> ~/.hermes/.env
```

セットアップウィザードは依存関係を自動で入れ、選んだモードに必要なものだけを入れます（クラウドなら `hindsight-client`、ローカルなら `hindsight-all`）。`hindsight-client >= 0.4.22` が必要です（古い場合はセッションの開始時に自動で更新されます）。

**ローカルモードの画面:** `hindsight-embed -p hermes ui start`

**設定ファイル:** `$HERMES_HOME/hindsight/config.json`

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `mode` | `cloud` | `cloud` または `local` |
| `bank_id` | `hermes` | メモリーバンクの識別子 |
| `recall_budget` | `mid` | 想起の丁寧さ: `low` / `mid` / `high` |
| `memory_mode` | `hybrid` | `hybrid`（文脈 + ツール）、`context`（自動の差し込みのみ）、`tools`（ツールのみ） |
| `auto_retain` | `true` | 会話のやり取りを自動で保持します |
| `auto_recall` | `true` | 各ターンの前にメモリーを自動で思い出します |
| `retain_async` | `true` | 保持の処理をサーバー側で非同期に行います |
| `retain_context` | `conversation between Hermes Agent and the User` | 保持したメモリーに付ける文脈のラベル |
| `retain_tags` | — | 保持したメモリーに既定で付けるタグ。ツール呼び出しごとのタグと合わさります |
| `retain_source` | — | 保持したメモリーに付ける `metadata.source`（任意） |
| `retain_user_prefix` | `User` | 自動で保持する記録のなかで、ユーザーの発言の前に置くラベル |
| `retain_assistant_prefix` | `Assistant` | 自動で保持する記録のなかで、アシスタントの発言の前に置くラベル |
| `recall_tags` | — | 想起のときに絞り込むタグ |

設定の詳しい説明は[プラグインの README](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/hindsight/README.md) にあります。

---

### Holographic {#holographic}

FTS5 の全文検索、信頼度の採点、そして組み合わせ計算のできる HRR（Holographic Reduced Representations）を備えた、手元の SQLite による事実の保管庫です。

| | |
|---|---|
| **向いている用途** | 外部に依存しない、手元だけで完結する高度な検索つきメモリー |
| **必要なもの** | 何も要りません（SQLite は常に使えます）。HRR の計算を使うなら NumPy があると便利です。 |
| **データの保存先** | 手元の SQLite |
| **費用** | 無料 |

**ツール:** `fact_store`（9 つの操作: add, search, probe, related, reason, contradict, update, remove, list）、`fact_feedback`（役に立った・立たなかったの評価で信頼度の採点を育てます）

**設定:**
```bash
hermes memory setup    # select "holographic"
# Or manually:
hermes config set memory.provider holographic
```

**設定ファイル:** `config.yaml` の `plugins.hermes-memory-store` の下

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `db_path` | `$HERMES_HOME/memory_store.db` | SQLite データベースの場所 |
| `auto_extract` | `false` | セッション終了時に事実を自動で抽出します |
| `default_trust` | `0.5` | 既定の信頼度（0.0〜1.0） |

**このプロバイダーならではの機能:**
- `probe` — 対象を指定した計算による想起（ある人やものに関する事実をすべて取り出す）
- `reason` — 複数の対象にまたがる AND 条件の問い合わせ
- `contradict` — 食い違う事実の自動検出
- 非対称なフィードバックによる信頼度の採点（役に立った +0.05 ／立たなかった -0.10）

---

### RetainDB {#retaindb}

ハイブリッド検索（ベクトル + BM25 + 再ランク付け）、7 種類のメモリー、差分圧縮を備えたクラウドのメモリー API です。

| | |
|---|---|
| **向いている用途** | すでに RetainDB の基盤を使っているチーム |
| **必要なもの** | RetainDB のアカウントと API キー |
| **データの保存先** | RetainDB Cloud |
| **費用** | 月額 20 ドル |

**ツール（10 個）:** `retaindb_profile`（ユーザーのプロフィール）、`retaindb_search`（意味検索）、`retaindb_context`（作業に関わる文脈）、`retaindb_remember`（種類と重要度を付けて保存）、`retaindb_forget`（メモリーの削除）、さらにファイル関連の `retaindb_upload_file`、`retaindb_list_files`、`retaindb_read_file`、`retaindb_ingest_file`、`retaindb_delete_file`

**設定:**
```bash
hermes memory setup    # select "retaindb"
# Or manually:
hermes config set memory.provider retaindb
echo "RETAINDB_API_KEY=your-key" >> ~/.hermes/.env
```

---

### ByteRover {#byterover}

`brv` CLI を通じて残り続けるメモリーです。階層的な知識の木を持ち、あいまい文字列検索から LLM による検索へと段階的に取り出します。手元を基本としつつ、クラウド同期も選べます。

| | |
|---|---|
| **向いている用途** | CLI で持ち運べる、手元中心のメモリーがほしい開発者 |
| **必要なもの** | ByteRover CLI（`npm install -g byterover-cli` または[インストールスクリプト](https://byterover.dev)） |
| **データの保存先** | 手元（既定）または ByteRover Cloud（同期は任意） |
| **費用** | 無料（手元）または ByteRover の料金（クラウド） |

**ツール:** `brv_query`（知識の木を検索）、`brv_curate`（事実・判断・傾向を保存）、`brv_status`（CLI のバージョンと木の統計）

**設定:**
```bash
# Install the CLI first
curl -fsSL https://byterover.dev/install.sh | sh

# Then configure Hermes
hermes memory setup    # select "byterover"
# Or manually:
hermes config set memory.provider byterover
```

**主な特徴:**
- 圧縮前の自動抽出（文脈の圧縮で消えてしまう前に、気づきを保存します）
- 知識の木は `$HERMES_HOME/byterover/` に置かれます（プロファイル単位）
- SOC2 Type II 認証を受けたクラウド同期（任意）

---

### Supermemory {#supermemory}

Supermemory のグラフ API を使った、意味に基づく長期メモリーです。プロフィールの想起、意味検索、明示的なメモリー操作のツール、そしてセッション終了時の会話の取り込みができます。

| | |
|---|---|
| **向いている用途** | ユーザー像の把握とセッション単位のグラフ構築を伴う、意味に基づく想起 |
| **必要なもの** | `pip install supermemory` と[クラウドの API キー](http://app.supermemory.ai/integrations?connect=hermes)、または[自前サーバー](https://supermemory.ai/docs/self-hosting/overview) |
| **データの保存先** | Supermemory Cloud または自前サーバー |
| **費用** | Supermemory の料金（クラウド）／無料（自前サーバー） |

**ツール:** `supermemory_store`（明示的にメモリーを保存）、`supermemory_search`（意味の近さで検索）、`supermemory_forget`（ID または一番近い問い合わせで忘れる）、`supermemory_profile`（残り続けるプロフィールと直近の文脈）

**設定:**
```bash
hermes memory setup    # select "supermemory"
# Or manually:
hermes config set memory.provider supermemory
echo 'SUPERMEMORY_API_KEY=***' >> ~/.hermes/.env
```

自前サーバーの場合は次のとおりです。

```bash
npx supermemory local
```

`hermes memory setup` を実行する前に、`$HERMES_HOME/supermemory.json` の
`base_url` を設定しておきます。

```json
{
  "base_url": "http://localhost:6767"
}
```

そのうえで `hermes memory setup` を実行し、ローカルサーバーが表示した API キーを
入力します。先に接続先を決めておくと、設定時の接続確認も手元だけで
済みます。

**設定ファイル:** `$HERMES_HOME/supermemory.json`

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `base_url` | `https://api.supermemory.ai` | ホスト版・自前サーバー版の Supermemory の接続先。`SUPERMEMORY_BASE_URL` より優先されます。 |
| `container_tag` | `hermes` | 検索と書き込みに使うコンテナのタグ。`{identity}` を書くとプロファイル単位のタグになります。 |
| `auto_recall` | `true` | ターンの前に関連するメモリーの文脈を差し込みます |
| `auto_capture` | `true` | 応答のたびに、整えたユーザーとアシスタントのやり取りを保存します |
| `max_recall_results` | `10` | 文脈に整形して差し込む、思い出した項目の最大数 |
| `profile_frequency` | `50` | 最初のターンと、以降 N ターンごとにプロフィールの事実を含めます |
| `capture_mode` | `all` | 既定では、ごく短いやり取りや中身のないやり取りを飛ばします |
| `search_mode` | `hybrid` | 検索の方法: `hybrid`、`memories`、`documents` |
| `api_timeout` | `5.0` | SDK と取り込みのリクエストのタイムアウト |

**環境変数:** `SUPERMEMORY_API_KEY`（必須）、`SUPERMEMORY_BASE_URL`（`base_url` が設定されていないときの互換用）、`SUPERMEMORY_CONTAINER_TAG`（設定ファイルを上書きします）。

ベース URL の優先順位は `supermemory.json` → `SUPERMEMORY_BASE_URL` → `https://api.supermemory.ai` です。SDK の操作、設定時や状態確認のための接続、会話の取り込みは、いずれも決まった接続先を使います。

**主な特徴:**
- 文脈の囲い込みを自動で行い、思い出したメモリーを保存対象のやり取りから取り除いて、メモリーが自分自身を汚していくのを防ぎます
- セッション全体の取り込み — セッションの区切りで会話をまとめて一度に送ります
- セッション終了時の会話の取り込み（`/v4/conversations` へ）により、Supermemory 側でより厚いプロフィールとグラフを作れます
- 自前サーバーへの経路が最初から最後まで揃っていて、SDK・接続確認・会話の取り込みが同じ接続先を使います
- 最初のターンと、決めた間隔でプロフィールの事実を差し込みます
- **プロファイル単位のコンテナ** — `container_tag` に `{identity}` を書く（例: `hermes-{identity}` → `hermes-coder`）と、Hermes のプロファイルごとにメモリーを分けられます
- **複数コンテナモード** — `enable_custom_container_tags` を有効にし、`custom_containers` に一覧を書くと、エージェントが名前付きのコンテナをまたいで読み書きできます。自動の処理は主コンテナのままです。

<details>
<summary>複数コンテナの例</summary>

```json
{
  "container_tag": "hermes",
  "enable_custom_container_tags": true,
  "custom_containers": ["project-alpha", "shared-knowledge"],
  "custom_container_instructions": "Use project-alpha for coding context."
}
```

</details>

**問い合わせ先:** [Discord](https://supermemory.link/discord) · [support@supermemory.com](mailto:support@supermemory.com)

### Memori {#memori}

Memori Cloud を使った、構造のある長期メモリーです。終わったやり取りをバックグラウンドで取り込み、ツールの内容も踏まえた文脈を持ち、事実・要約・利用量・登録・フィードバックのための明示的な想起ツールを備えます。

| | |
|---|---|
| **向いている用途** | プロジェクトやセッションの帰属を構造として持ち、エージェント自身が想起を制御する使い方 |
| **必要なもの** | `pip install hermes-memori` と `hermes-memori install`、そして [Memori の API キー](https://app.memorilabs.ai/signup) |
| **データの保存先** | Memori Cloud |
| **費用** | Memori の料金 |

**ツール:** `memori_recall`（長期メモリーの検索）、`memori_recall_summary`（要約された文脈）、`memori_quota`（利用量・上限）、`memori_signup`（登録メールの依頼）、`memori_feedback`（連携についての意見の送信）

**設定:**
```bash
pip install hermes-memori
hermes-memori install
hermes config set memory.provider memori
hermes memory setup
```

---

## プロバイダーの比較 {#provider-comparison}

| プロバイダー | 保存先 | 費用 | ツール | 依存 | 特徴 |
|----------|---------|------|-------|-------------|----------------|
| **Honcho** | クラウド | 有料 | 5 | `honcho-ai` | 対話的なユーザーモデリング + セッション単位の文脈 |
| **OpenViking** | 自前 | 無料 | 6 | `openviking` + サーバー | ファイルシステム風の階層 + 段階的な読み込み |
| **Mem0** | クラウド／自前 | 無料・有料 | 4 | `mem0ai` | サーバー側の LLM による抽出 + 自前／OSS モード |
| **Hindsight** | クラウド／ローカル | 無料・有料 | 3 | `hindsight-client` | 知識グラフ + reflect によるまとめ |
| **Holographic** | ローカル | 無料 | 2 | なし | HRR の計算 + 信頼度の採点 |
| **RetainDB** | クラウド | 月 20 ドル | 10 | `requests` | 差分圧縮 |
| **ByteRover** | ローカル／クラウド | 無料・有料 | 3 | `brv` CLI | 圧縮前の抽出 |
| **Supermemory** | クラウド／自前 | 無料・有料 | 4 | `supermemory` | 文脈の囲い込み + セッションのグラフ取り込み + 複数コンテナ |
| **Memori** | クラウド | 無料・有料 | 5 | `hermes-memori` | ツールを踏まえたメモリー + 構造のある想起 |

## プロファイルごとの分離 {#profile-isolation}

各プロバイダーのデータは[プロファイル](/hermes/docs/user-guide/profiles/)ごとに分かれています。

- **手元に保存するプロバイダー**（Holographic、ByteRover）は `$HERMES_HOME/` の下を使い、この場所はプロファイルごとに違います
- **設定ファイルを使うプロバイダー**（Honcho、Mem0、Hindsight、Supermemory）は設定を `$HERMES_HOME/` に置くので、プロファイルごとに別々の認証情報を持てます
- **クラウドのプロバイダー**（RetainDB）はプロファイル単位のプロジェクト名を自動で作ります
- **環境変数を使うプロバイダー**（OpenViking）はプロファイルごとの `.env` ファイルで設定します

## メモリープロバイダーを作る {#building-a-memory-provider}

自分で作る方法は[開発者ガイド: メモリープロバイダープラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)にあります。
