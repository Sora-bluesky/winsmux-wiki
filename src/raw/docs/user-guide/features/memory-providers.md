---
title: "記憶プロバイダ"
description: "外部の記憶プロバイダプラグイン — Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover、Supermemory"
upstream_path: user-guide/features/memory-providers.md
upstream_blob: 1c35b07589c673e26ec28963986606cc25187999
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers
---

# 記憶プロバイダ {#memory-providers}

Hermes Agent には、外部の記憶プロバイダのプラグインが8つ同梱されています。これらは、組み込みの MEMORY.md や USER.md を超えて、セッションをまたいで残る知識をエージェントに与えます。外部プロバイダは同時に**ひとつ**だけ有効にできます。組み込みの記憶は、そのプロバイダと並んで常に動いています。

## すぐに使う {#quick-start}

```bash
hermes memory setup      # interactive picker + configuration
hermes memory status     # check what's active
hermes memory off        # disable external provider
```

`hermes plugins` → Provider Plugins → Memory Provider からも、有効な記憶プロバイダを選べます。

`~/.hermes/config.yaml` に直接書くこともできます。

```yaml
memory:
  provider: openviking   # or honcho, mem0, hindsight, holographic, retaindb, byterover, supermemory
```

## 仕組み {#how-it-works}

記憶プロバイダが有効なとき、Hermes は次のことを自動で行います。

1. **プロバイダの文脈を差し込む** — システムプロンプトに、そのプロバイダが知っていることを入れます
2. **関係のありそうな記憶を先に取ってくる** — 各ターンの前に、待たせないよう裏側で行います
3. **会話のターンを同期する** — 応答のたびにプロバイダへ送ります
4. **セッション終了時に記憶を抽出する** — 対応しているプロバイダの場合
5. **組み込みの記憶への書き込みを写す** — 外部プロバイダにも同じ内容を反映します
6. **プロバイダ固有のツールを足す** — エージェントが記憶を検索・保存・管理できるようにします

組み込みの記憶（MEMORY.md / USER.md）は、これまでとまったく同じように動き続けます。外部プロバイダは、その上に足されるものです。

## 使えるプロバイダ {#available-providers}

### Honcho {#honcho}

対話的な推論（dialectic reasoning）、セッション単位の文脈の差し込み、意味検索、残り続ける結論を備えた、AI 前提のセッション横断のユーザーモデリングです。基本となる文脈には、ユーザー像とピアカードに加えてセッションの要約も入るようになり、すでに話した内容をエージェントが把握できます。

| | |
|---|---|
| **向いている用途** | セッションをまたいだ文脈を持つ複数エージェントの構成、ユーザーとエージェントの認識合わせ |
| **必要なもの** | `pip install honcho-ai` と [API キー](https://app.honcho.dev)、または自前で立てたインスタンス |
| **データの保存先** | Honcho Cloud または自前のサーバー |
| **費用** | Honcho の料金（クラウド）／無料（自前運用） |

**ツール（5個）:** `honcho_profile`（ピアカードの読み書き）、`honcho_search`（意味検索）、`honcho_context`（セッションの文脈 — 要約、ユーザー像、カード、メッセージ）、`honcho_reasoning`（LLM がまとめたもの）、`honcho_conclude`（結論の作成・削除）

**構成:** 文脈の差し込みは二層です。基本の層（セッションの要約＋ユーザー像＋ピアカード、`contextCadence` の間隔で更新）に、対話的な補足（LLM による推論、`dialecticCadence` の間隔で更新）が重なります。この対話的な処理は、基本の層があるかどうかで、コールドスタート用のプロンプト（ユーザーの一般的な事実）とウォーム用のプロンプト（セッション単位の文脈）を自動で選び分けます。

**3つの独立した設定つまみ**で、費用と深さをそれぞれ別に調整できます。

- `contextCadence` — 基本の層を更新する間隔（API 呼び出しの頻度）
- `dialecticCadence` — 対話的な LLM が動く間隔（LLM 呼び出しの頻度）
- `dialecticDepth` — 1回の対話処理あたりの `.chat()` の回数（1〜3、推論の深さ）

自動で差し込まれる対話処理は、問い合わせの長さに応じて推論の水準も変えます（長い問い合わせほど深く推論し、上限は `reasoningLevelCap`）。詳しくは [問い合わせに応じた推論水準](/hermes/docs/user-guide/features/honcho/#query-adaptive-reasoning-level) を参照してください。

**セットアップの案内:**
```bash
hermes memory setup        # select "honcho" — runs the Honcho-specific post-setup
```

以前からの `hermes honcho setup` コマンドもまだ動きます（いまは `hermes memory setup` へ転送されます）が、Honcho を有効な記憶プロバイダとして選んだあとにしか登録されません。

**画面のない端末・遠隔の端末:** ブラウザのない環境（SSH、遠隔の仮想マシン）でクラウド認証を行うには、セットアップの認証方法の質問で **device** を選びます。CLI が短いコードと確認用のリンクを表示するので、別の端末のブラウザでそのリンクを開いて承認すれば、セットアップが完了します。API キーをコピーして貼り付ける必要はありません。使えるローカルのブラウザが見つからない場合、セットアップは自動的にこの方法を既定にします。

**設定ファイル:** `$HERMES_HOME/honcho.json`（プロファイルごと）または `~/.honcho/config.json`（全体）。読み込みの優先順位は `$HERMES_HOME/honcho.json` > `~/.hermes/honcho.json` > `~/.honcho/config.json` です。[設定の一覧](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/honcho/README.md) と [Honcho 連携ガイド](https://docs.honcho.dev/v3/guides/integrations/hermes) を参照してください。

<details>
<summary>設定の全一覧</summary>

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `apiKey` | -- | [app.honcho.dev](https://app.honcho.dev) で取得する API キー |
| `baseUrl` | -- | 自前で立てた Honcho のベース URL |
| `peerName` | -- | ユーザー側のピアの識別名 |
| `aiPeer` | host key | AI 側のピアの識別名（プロファイルにつき1つ） |
| `workspace` | host key | 共有するワークスペースの ID |
| `contextTokens` | `null`（上限なし） | 1ターンあたり自動で差し込む文脈のトークン上限。単語の切れ目で打ち切ります |
| `contextCadence` | `1` | `context()` の API 呼び出しの最小間隔ターン数（基本の層の更新） |
| `dialecticCadence` | `2` | `peer.chat()` の LLM 呼び出しの最小間隔ターン数。1〜5 を推奨。`hybrid`／`context` モードにのみ適用されます |
| `dialecticDepth` | `1` | 1回の対話処理あたりの `.chat()` の回数。1〜3 に収められます。0回目: コールド／ウォームのプロンプト、1回目: 自己点検、2回目: すり合わせ |
| `dialecticDepthLevels` | `null` | 各回の推論水準を並べた任意の配列（例: `["minimal", "low", "medium"]`）。比例配分の既定値を上書きします |
| `dialecticReasoningLevel` | `'low'` | 基本の推論水準: `minimal`、`low`、`medium`、`high`、`max` |
| `dialecticDynamic` | `true` | `true` のとき、モデルがツールの引数で呼び出しごとに推論水準を上書きできます |
| `dialecticMaxChars` | `600` | システムプロンプトへ差し込む対話結果の最大文字数 |
| `recallMode` | `'hybrid'` | `hybrid`（自動差し込み＋ツール）、`context`（差し込みのみ）、`tools`（ツールのみ） |
| `writeFrequency` | `'async'` | メッセージを送り出すタイミング: `async`（裏側のスレッド）、`turn`（同期）、`session`（終了時にまとめて）、または整数 N |
| `saveMessages` | `true` | メッセージを Honcho の API に残すかどうか |
| `observationMode` | `'directional'` | `directional`（すべて有効）または `unified`（共有の一本化）。`observation` オブジェクトで上書きできます |
| `messageMaxChars` | `25000` | 1メッセージあたりの最大文字数（超えると分割されます） |
| `dialecticMaxInputChars` | `10000` | `peer.chat()` へ渡す問い合わせ入力の最大文字数 |
| `sessionStrategy` | `'per-directory'` | `per-directory`、`per-repo`、`per-session`、`global` |
| `pinUserPeer` | `false` | ゲートウェイ専用。`true` のとき、エージェント以外のゲートウェイ利用者はすべて `peerName` にまとめられます。この固定はすべての別名より優先されます |
| `userPeerAliases` | `{}` | ゲートウェイ専用。実行時の ID をピアへ対応づけます（`{"7654321": "alice"}`）。多対一です |
| `runtimePeerPrefix` | `""` | ゲートウェイ専用。別名に当てはまらない未知の実行時 ID に名前空間を付けます（`telegram_7654321`） |

</details>

<details>
<summary>最小構成の honcho.json（クラウド）</summary>

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
<summary>最小構成の honcho.json（自前運用）</summary>

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
以前 `hermes honcho setup` を使っていた場合、設定もサーバー側のデータもそのまま残っています。セットアップの案内からもう一度有効にするか、`memory.provider: honcho` を手で設定すれば、新しい仕組みで再び動き出します。
:::

**複数ピアの構成:**

Honcho は、会話を「メッセージをやり取りするピアたち」として捉えます。Hermes のプロファイルごとに、ユーザー側のピアが1つと AI 側のピアが1つあり、すべてが同じワークスペースを共有します。ワークスペースは共有の場です。ユーザー側のピアはプロファイルをまたいで共通で、AI 側のピアはそれぞれ別の人格になります。AI 側の各ピアは自分の観察から独立したユーザー像とカードを作るので、同じユーザーに対して `coder` プロファイルはコード寄りのまま、`writer` プロファイルは文章寄りのままでいられます。

対応関係:

| 概念 | 中身 |
|---------|-----------|
| **ワークスペース** | 共有の場。ひとつのワークスペースの下にある Hermes のプロファイルは、同じユーザーの人格を見ます。 |
| **ユーザー側のピア**（`peerName`） | 人間のこと。ワークスペース内のプロファイル間で共有されます。 |
| **AI 側のピア**（`aiPeer`） | Hermes のプロファイルにつき1つ。ホストキー `hermes` が既定、それ以外は `hermes.<profile>` になります。 |
| **観察** | 誰のメッセージから何をモデル化するかを決める、ピアごとの切り替えです。`directional`（既定、4つすべて有効）または `unified`（観察者を一本化）。 |

### 新しいプロファイルに新しい Honcho のピアを作る {#new-profile-fresh-honcho-peer}

```bash
hermes profile create coder --clone
```

`--clone` は、`honcho.json` に `hermes.coder` のホストブロックを作り、`aiPeer: "coder"`、共有の `workspace`、引き継いだ `peerName`、`recallMode`、`writeFrequency`、`observation` などを設定します。AI 側のピアは Honcho 側で先に作られるので、最初のメッセージの時点ですでに存在します。

### すでにあるプロファイルに Honcho のピアを補う {#existing-profiles-backfill-honcho-peers}

```bash
hermes honcho sync
```

Hermes のすべてのプロファイルを調べ、ホストブロックのないものには作り、既定の `hermes` ブロックから設定を引き継ぎ、新しい AI 側のピアを先に作ります。何度実行しても同じ結果になり、すでにホストブロックのあるプロファイルは飛ばします。

### プロファイルごとの観察 {#per-profile-observation}

ホストブロックはそれぞれ、観察の設定を独立して上書きできます。例として、AI 側のピアがユーザーは観察するが自分自身はモデル化しない、コード向けのプロファイルを示します。

```json
"hermes.coder": {
  "aiPeer": "coder",
  "observation": {
    "user": { "observeMe": true, "observeOthers": true },
    "ai":   { "observeMe": false, "observeOthers": true }
  }
}
```

**観察の切り替え（ピアごとに1組）:**

| 切り替え | 効果 |
|--------|--------|
| `observeMe` | Honcho が、このピア自身のメッセージからこのピアの像を作ります |
| `observeOthers` | このピアが相手のピアのメッセージを観察します（ピアをまたいだ推論の材料になります） |

`observationMode` によるプリセット:

- **`"directional"`**（既定） — 4つの切り替えがすべて有効です。相互に完全に観察し、ピアをまたいだ対話的な推論が可能になります。
- **`"unified"`** — ユーザー側は `observeMe: true`、AI 側は `observeOthers: true`、残りは無効です。観察者を一本化する形で、AI はユーザーをモデル化しますが自分自身はモデル化せず、ユーザー側のピアは自分自身だけをモデル化します。

[Honcho のダッシュボード](https://app.honcho.dev) で設定したサーバー側の切り替えは、手元の既定値より優先されます。セッションの開始時に同期されて戻ってきます。

観察の設定の全体は [Honcho のページ](/hermes/docs/user-guide/features/honcho/#observation-directional-vs-unified) を参照してください。

### ゲートウェイでの人格の対応づけ {#gateway-identity-mapping}

ここまでのピアのモデルは、CLI・TUI・デスクトップのセッションを扱うもので、どの会話も `peerName` に行き着きます。[ゲートウェイ](/hermes/docs/developer-guide/gateway-internals/) では、もうひとつの軸が加わります。利用者はプラットフォーム固有の実行時 ID（Telegram の UID、Discord の snowflake、Slack のユーザー）で現れ、どの ID がどのピアになるかを3つのキーが決めます。

| キー | 効果 |
|-----|--------|
| `pinUserPeer: true` | エージェント以外のゲートウェイ利用者は、すべて `peerName` にまとめられます。この固定は最初に判定されるため、すべての別名より優先されます。ユーザー側の人格をひとつも分ける必要がない場合にだけ選んでください |
| `userPeerAliases` | 特定の実行時 ID をピアへ対応づけます（`{"7654321": "alice"}`）。別々の人格を振り分ける場所で、それぞれ自分のピアを持つエージェントもここで扱います |
| `runtimePeerPrefix` | 対応づけのない実行時 ID に名前空間を付け（`telegram_7654321`）、似た形の ID を持つプラットフォーム同士がぶつからないようにします |

ゲートウェイを使っていなければ、これらのキーは何もしません。`hermes memory setup` は、ゲートウェイのプラットフォームがつながっていると判断したときにだけ、これらを尋ねます。判定の順序とセットアップの流れは [Honcho のページ](/hermes/docs/user-guide/features/honcho/#gateway-identity-mapping) を参照してください。

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

[設定の一覧](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/honcho/README.md) と [Honcho 連携ガイド](https://docs.honcho.dev/v3/guides/integrations/hermes) を参照してください。

---

### OpenViking {#openviking}

Volcengine（ByteDance）による文脈データベースです。ファイルシステムのような知識の階層、段階的な取り出し、6つの分類への自動的な記憶の抽出を備えています。

| | |
|---|---|
| **向いている用途** | 構造をたどって見て回れる、自前運用の知識管理 |
| **必要なもの** | OpenViking の初期化・検証・起動が済んでいること |
| **データの保存先** | 自前運用（手元またはクラウド） |
| **費用** | 無料（オープンソース、AGPL-3.0） |

**ツール（6個）:** `viking_search`（意味検索）、`viking_read`（段階的: 要旨／概要／全文）、`viking_browse`（ファイルシステム風の移動）、`viking_remember`（事実の保存）、`viking_forget`（`viking://` の URI をそのまま指定して記憶ファイルを削除）、`viking_add_resource`（URL や文書の取り込み）

**セットアップ:**
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

`hermes memory setup` は、`~/.openviking/ovcli.conf` にある接続情報をそのまま使ったり
写したりできます。手で設定する場合は、有効なプロファイルの `.env` ファイルを使います。
既定のプロファイルなら `~/.hermes/.env`、名前付きのプロファイルなら
`~/.hermes/profiles/<profile>/.env` です。

```text
OPENVIKING_ENDPOINT=http://127.0.0.1:1933
# OPENVIKING_API_KEY=...
# OPENVIKING_ACCOUNT=default
# OPENVIKING_USER=default
```

OpenViking のサーバー側の設定は `ov.conf` にあります（`--config`、
`OPENVIKING_CONFIG_FILE`、または `~/.openviking/ov.conf`）。クライアント側の接続情報は
`ovcli.conf` にあります（`OPENVIKING_CLI_CONFIG_FILE` または
`~/.openviking/ovcli.conf`）。

**主な特徴:**
- 段階的な文脈の読み込み: L0（約100トークン）→ L1（約2千）→ L2（全文）
- セッションの確定時に記憶を自動で抽出（プロフィール、好み、対象、出来事、事例、パターン）
- 階層をたどって知識を見て回るための `viking://` という URI の書き方

`OPENVIKING_ACCOUNT` と `OPENVIKING_USER` は、手元・信頼できる環境向けのモードで使います。
ピアの識別は任意です。既定では、Hermes はピア ID を送らず、明示的な記憶を
`viking://user/<user>/memories/...` に書きます。セットアップはピア ID を尋ねません。
アシスタント用の文脈を分けたい場合は、`config.yaml` に
`memory.openviking.agent: work-assistant` を設定してください。

すでに空でないピアの設定がある場合は、これまでどおりピア単位の書き込みと呼び出しが
続きます。これには `OPENVIKING_AGENT` や、連携している OpenViking の設定にある
`actor_peer_id`、旧来の `agent_id` が含まれます。既存の記憶が移動したり削除されたり
することはありません。
ピア ID がない場合、既定の検索は、同じ OpenViking ユーザーの下にあるユーザーの記憶と
既存のピアの記憶の両方を対象にします。古いピアの記憶も、いまある場所のまま検索できます。
どの記憶が返るかは、順位付けと件数の上限で決まります。
以前のピア単位の書き込みに戻すには、`memory.openviking.agent: hermes` を設定します。
この変更より前にユーザー単位で書かれた記憶はその場所に残り、検索もできます。
この設定が変えるのはこれからの書き込みで、既存の記憶の場所は変わりません。

Hermes は OpenViking へのリクエストに
`User-Agent: openviking-memory-hermes/<version>` を付けます。これは仕組みを示す
標準的な識別子で、利用者ごとの識別情報は含まれず、リクエストが増えることもありません。

---

### Mem0 {#mem0}

サーバー側で LLM が事実を抽出し、意味検索、並べ替え、重複の自動整理を行います。接続方法は3つあります。**Platform**（Mem0 Cloud）、**自前運用のダッシュボード**（Docker で自分が動かす Mem0 サーバー）、**OSS**（自分の LLM とベクトルストアで Mem0 をプロセス内で動かす）です。

| | |
|---|---|
| **向いている用途** | 手のかからない記憶の管理 — 抽出は Mem0 が自動でやってくれます |
| **必要なもの** | `pip install mem0ai` と API キー（platform）、動作中の Mem0 サーバー（自前運用のダッシュボード）、または LLM とベクトルストア（OSS） |
| **データの保存先** | Mem0 Cloud（platform）、自分の Mem0 サーバー（自前運用のダッシュボード）、またはプロセス内（OSS） |
| **費用** | Mem0 の料金（platform）／無料（自前運用または OSS） |

**ツール（4個）:** `mem0_search`（意味検索。platform モードでは並べ替えも任意で使えますが、既定では無効）、`mem0_add`（事実をそのまま保存）、`mem0_update`（ID を指定して更新）、`mem0_delete`（ID を指定して削除）

**セットアップ（Platform）:**
```bash
hermes memory setup    # select "mem0" → "Platform"
# Or manually:
hermes config set memory.provider mem0
echo "MEM0_API_KEY=your-key" >> ~/.hermes/.env
```

**セットアップ（OSS）:**
```bash
hermes memory setup    # select "mem0" → "Open Source (self-hosted)"
# Or via flags:
hermes memory setup mem0 --mode oss --oss-llm openai --oss-llm-key sk-... --oss-vector qdrant
```

ファイルを書かずに内容を確認する:
```bash
hermes memory setup mem0 --mode oss --oss-llm-key sk-... --dry-run
```

**セットアップ（自前運用のダッシュボード）:** Docker で動かしている Mem0 サーバー（ダッシュボードの REST API）につなぎます。

```bash
hermes memory setup    # select "mem0" → "Self-hosted server"
# Or via flags:
hermes memory setup mem0 --mode selfhosted --host http://localhost:8888 --api-key your-admin-api-key
```

手で設定することもできます。環境変数として書く場合:

```bash
echo "MEM0_HOST=http://localhost:8888" >> ~/.hermes/.env
echo "MEM0_API_KEY=your-admin-api-key" >> ~/.hermes/.env
```

`mem0.json` に書く場合:

```json
{ "host": "http://localhost:8888", "api_key": "your-admin-api-key" }
```

このプラグインは `X-API-Key` で認証し、サーバーの `/search` と `/memories` の経路を使います。`api_key` は任意です（`AUTH_DISABLED` のサーバーのときだけ省いてください）。`mode: oss` は設定しないでください — `host` より優先されてしまいます。

**設定ファイル:** `$HERMES_HOME/mem0.json`（動作に関する設定）。`~/.hermes/.env` に置くのは、秘密である `MEM0_API_KEY` だけです。

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `mode` | `platform` | `platform`（Mem0 Cloud）または `oss`（自分で管理し、プロセス内で動かす） |
| `host` | — | 自前運用の Mem0 サーバーの URL（Docker のダッシュボード）。`X-API-Key` を付けて HTTP で通信します。`mode: oss` と併用しないでください |
| `user_id` | `hermes-user` | ユーザーの識別子 |
| `agent_id` | `hermes` | エージェントの識別子 |
| `rerank` | `false` | 検索結果を関連度で並べ替えます（platform モードのみ） |

**OSS で使えるプロバイダ:**

| 要素 | プロバイダ |
|-----------|-----------|
| LLM | openai, ollama |
| 埋め込み | openai, ollama |
| ベクトルストア | qdrant（ローカル／サーバー）, pgvector |

**モードの切り替え:** `hermes memory setup mem0 --mode <platform|selfhosted|oss>` をもう一度実行するか、`mem0.json` を直接書き換えてください。

---

### Hindsight {#hindsight}

知識グラフ、対象の名寄せ、複数の方法を組み合わせた取り出しを備えた長期記憶です。`hindsight_reflect` ツールは、記憶をまたいでまとめ直す機能で、ほかのプロバイダにはありません。ツール呼び出しを含む会話のターンを、セッション単位の文書の追跡とともに自動で保存します。

| | |
|---|---|
| **向いている用途** | 対象どうしの関係を持つ、知識グラフに基づく呼び出し |
| **必要なもの** | クラウド: [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) の API キー。ローカル: LLM の API キー（OpenAI、Groq、OpenRouter など） |
| **データの保存先** | Hindsight Cloud、または手元に組み込まれた PostgreSQL |
| **費用** | Hindsight の料金（クラウド）または無料（ローカル） |

**ツール:** `hindsight_retain`（対象を抜き出しながら保存）、`hindsight_recall`（複数の方法での検索）、`hindsight_reflect`（記憶をまたいだまとめ直し）

**セットアップ:**
```bash
hermes memory setup    # select "hindsight"
# Or manually:
hermes config set memory.provider hindsight
echo "HINDSIGHT_API_KEY=your-key" >> ~/.hermes/.env
```

セットアップの案内は依存関係を自動で入れますが、選んだモードに必要なものだけを入れます（クラウドなら `hindsight-client`、ローカルなら `hindsight-all`）。`hindsight-client >= 0.4.22` が必要です（古い場合はセッションの開始時に自動で更新されます）。

**ローカルモードの画面:** `hindsight-embed -p hermes ui start`

**設定ファイル:** `$HERMES_HOME/hindsight/config.json`

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `mode` | `cloud` | `cloud` または `local` |
| `bank_id` | `hermes` | 記憶バンクの識別子 |
| `recall_budget` | `mid` | 呼び出しの丁寧さ: `low` / `mid` / `high` |
| `memory_mode` | `hybrid` | `hybrid`（文脈＋ツール）、`context`（自動の差し込みのみ）、`tools`（ツールのみ） |
| `auto_retain` | `true` | 会話のターンを自動で保存します |
| `auto_recall` | `true` | 各ターンの前に自動で記憶を呼び出します |
| `retain_async` | `true` | 保存の処理をサーバー側で非同期に行います |
| `retain_context` | `conversation between Hermes Agent and the User` | 保存する記憶に付ける文脈のラベル |
| `retain_tags` | — | 保存する記憶に付ける既定のタグ。呼び出しごとのツールのタグと統合されます |
| `retain_source` | — | 保存する記憶に付ける任意の `metadata.source` |
| `retain_user_prefix` | `User` | 自動保存の記録で、ユーザーのターンの前に付けるラベル |
| `retain_assistant_prefix` | `Assistant` | 自動保存の記録で、アシスタントのターンの前に付けるラベル |
| `recall_tags` | — | 呼び出しのときに絞り込むタグ |

設定の全体は [プラグインの README](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/hindsight/README.md) を参照してください。

---

### Holographic {#holographic}

FTS5 の全文検索、信頼度の採点、組み合わせた代数的な問い合わせのための HRR（Holographic Reduced Representations）を備えた、手元の SQLite の事実置き場です。

| | |
|---|---|
| **向いている用途** | 外部に依存しない、手元だけで完結する高機能な記憶 |
| **必要なもの** | 何もありません（SQLite は常に使えます）。HRR の代数には NumPy が任意で使えます。 |
| **データの保存先** | 手元の SQLite |
| **費用** | 無料 |

**ツール:** `fact_store`（9つの操作: add、search、probe、related、reason、contradict、update、remove、list）、`fact_feedback`（役に立った／立たなかったの評価で、信頼度の採点を学習させます）

**セットアップ:**
```bash
hermes memory setup    # select "holographic"
# Or manually:
hermes config set memory.provider holographic
```

**設定:** `config.yaml` の `plugins.hermes-memory-store` の下

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `db_path` | `$HERMES_HOME/memory_store.db` | SQLite のデータベースのパス |
| `auto_extract` | `false` | セッションの終了時に事実を自動で抽出します |
| `default_trust` | `0.5` | 既定の信頼度（0.0〜1.0） |

**このプロバイダならではの機能:**
- `probe` — 対象を指定した代数的な呼び出し（ある人・ある物についての事実をすべて）
- `reason` — 複数の対象をまたいだ AND の組み合わせ問い合わせ
- `contradict` — 矛盾する事実の自動検出
- 非対称なフィードバックによる信頼度の採点（役に立った +0.05 ／立たなかった -0.10）

---

### RetainDB {#retaindb}

ハイブリッド検索（ベクトル＋BM25＋並べ替え）、7種類の記憶、差分圧縮を備えたクラウドの記憶 API です。

| | |
|---|---|
| **向いている用途** | すでに RetainDB の基盤を使っているチーム |
| **必要なもの** | RetainDB のアカウントと API キー |
| **データの保存先** | RetainDB Cloud |
| **費用** | 月額 $20 |

**ツール（10個）:** `retaindb_profile`（ユーザーのプロフィール）、`retaindb_search`（意味検索）、`retaindb_context`（作業に関係する文脈）、`retaindb_remember`（種類と重要度を付けて保存）、`retaindb_forget`（記憶の削除）、それにファイル系のツール `retaindb_upload_file`、`retaindb_list_files`、`retaindb_read_file`、`retaindb_ingest_file`、`retaindb_delete_file`

**セットアップ:**
```bash
hermes memory setup    # select "retaindb"
# Or manually:
hermes config set memory.provider retaindb
echo "RETAINDB_API_KEY=your-key" >> ~/.hermes/.env
```

---

### ByteRover {#byterover}

`brv` という CLI を通じた、残り続ける記憶です。階層構造の知識ツリーと、段階的な取り出し（あいまいな文字列検索から LLM による検索へ）を備えています。手元を基本としつつ、クラウドとの同期も任意で使えます。

| | |
|---|---|
| **向いている用途** | 手元を基本にした、持ち運びできる記憶を CLI で扱いたい開発者 |
| **必要なもの** | ByteRover の CLI（`npm install -g byterover-cli` または [インストール用スクリプト](https://byterover.dev)） |
| **データの保存先** | 手元（既定）または ByteRover Cloud（任意の同期） |
| **費用** | 無料（手元）または ByteRover の料金（クラウド） |

**ツール:** `brv_query`（知識ツリーの検索）、`brv_curate`（事実・決定・パターンの保存）、`brv_status`（CLI の版数とツリーの統計）

**セットアップ:**
```bash
# Install the CLI first
curl -fsSL https://byterover.dev/install.sh | sh

# Then configure Hermes
hermes memory setup    # select "byterover"
# Or manually:
hermes config set memory.provider byterover
```

**主な特徴:**
- 圧縮の前に自動で抽出（文脈の圧縮で捨てられる前に、気づきを残します）
- 知識ツリーは `$HERMES_HOME/byterover/` に保存されます（プロファイル単位）
- SOC2 Type II 認証を受けたクラウド同期（任意）

---

### Supermemory {#supermemory}

Supermemory のグラフ API を通じた、意味に基づく長期記憶です。プロフィールの呼び出し、意味検索、明示的な記憶のツール、セッション終了時の会話の取り込みを備えています。

| | |
|---|---|
| **向いている用途** | ユーザー像の把握とセッション単位のグラフ作りを伴う、意味に基づく呼び出し |
| **必要なもの** | `pip install supermemory` と [クラウドの API キー](http://app.supermemory.ai/integrations?connect=hermes)、または [自前で立てたサーバー](https://supermemory.ai/docs/self-hosting/overview) |
| **データの保存先** | Supermemory Cloud または自前のサーバー |
| **費用** | Supermemory の料金（クラウド）／無料（自前運用） |

**ツール:** `supermemory_store`（明示的な記憶の保存）、`supermemory_search`（意味の近さによる検索）、`supermemory_forget`（ID または最も近い問い合わせで忘れる）、`supermemory_profile`（残り続けるプロフィールと直近の文脈）

**セットアップ:**
```bash
hermes memory setup    # select "supermemory"
# Or manually:
hermes config set memory.provider supermemory
echo 'SUPERMEMORY_API_KEY=***' >> ~/.hermes/.env
```

自前で立てる場合のセットアップ:

```bash
npx supermemory local
```

`hermes memory setup` を実行する前に、`$HERMES_HOME/supermemory.json` で
`base_url` を設定してください。

```json
{
  "base_url": "http://localhost:6767"
}
```

そのうえで `hermes memory setup` を実行し、手元のサーバーが表示した API キーを
入力します。先に接続先を設定しておけば、セットアップ中の接続確認も手元だけで
完結します。

**設定ファイル:** `$HERMES_HOME/supermemory.json`

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `base_url` | `https://api.supermemory.ai` | ホスト版または自前運用の Supermemory の接続先。`SUPERMEMORY_BASE_URL` より優先されます。 |
| `container_tag` | `hermes` | 検索と書き込みに使うコンテナのタグ。プロファイル単位のタグにするための `{identity}` の書き方に対応しています。 |
| `auto_recall` | `true` | ターンの前に、関係のある記憶の文脈を差し込みます |
| `auto_capture` | `true` | 応答のたびに、整えたユーザーとアシスタントのやり取りを保存します |
| `max_recall_results` | `10` | 文脈に整形して入れる、呼び出した項目の最大数 |
| `profile_frequency` | `50` | 最初のターンと、そのあと N ターンごとにプロフィールの事実を含めます |
| `capture_mode` | `all` | 既定では、ごく短いやり取りやささいなやり取りを飛ばします |
| `search_mode` | `hybrid` | 検索の方法: `hybrid`、`memories`、`documents` |
| `api_timeout` | `5.0` | SDK と取り込みのリクエストの待ち時間の上限 |

**環境変数:** `SUPERMEMORY_API_KEY`（必須）、`SUPERMEMORY_BASE_URL`（`base_url` が設定されていないときの互換のための代替）、`SUPERMEMORY_CONTAINER_TAG`（設定を上書きします）。

ベース URL の優先順位は `supermemory.json` → `SUPERMEMORY_BASE_URL` → `https://api.supermemory.ai` です。SDK の操作も、セットアップや状態の確認も、会話の取り込みも、すべて同じように解決された接続先を使います。

**主な特徴:**
- 文脈の自動的な仕切り — 呼び出した記憶を、保存するやり取りから取り除き、記憶が記憶を汚していくのを防ぎます
- セッション全体の取り込み — 会話の全体が、セッションの区切りで一度に送られます
- セッション終了時の会話の取り込み（`/v4/conversations` へ）により、Supermemory 側でより豊かなプロフィールとグラフを作ります
- 端から端まで自前運用に沿った経路 — SDK も、確認も、会話の取り込みも、同じ設定された接続先を使います
- プロフィールの事実を、最初のターンと、設定した間隔で差し込みます
- **プロファイル単位のコンテナ** — `container_tag` に `{identity}` を使うと（例: `hermes-{identity}` → `hermes-coder`）、Hermes のプロファイルごとに記憶を分けられます
- **複数コンテナのモード** — `enable_custom_container_tags` を有効にし、`custom_containers` の一覧を指定すると、エージェントが名前付きのコンテナをまたいで読み書きできます。自動の処理は主となるコンテナに留まります。

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

Memori Cloud を使った、構造のある長期記憶です。終わったターンを裏側で取り込み、ツールを踏まえたターンの文脈を持ち、事実・要約・利用枠・登録・フィードバックのための明示的な呼び出しツールを備えています。

| | |
|---|---|
| **向いている用途** | プロジェクトとセッションの帰属が構造として残る、エージェント主導の呼び出し |
| **必要なもの** | `pip install hermes-memori` と `hermes-memori install`、それに [Memori の API キー](https://app.memorilabs.ai/signup) |
| **データの保存先** | Memori Cloud |
| **費用** | Memori の料金 |

**ツール:** `memori_recall`（長期記憶の検索）、`memori_recall_summary`（要約された文脈）、`memori_quota`（使用量と枠）、`memori_signup`（登録メールの依頼）、`memori_feedback`（連携についての意見の送信）

**セットアップ:**
```bash
pip install hermes-memori
hermes-memori install
hermes config set memory.provider memori
hermes memory setup
```

---

## プロバイダの比較 {#provider-comparison}

| プロバイダ | 保存先 | 費用 | ツール | 依存関係 | 特徴的な機能 |
|----------|---------|------|-------|-------------|----------------|
| **Honcho** | クラウド | 有料 | 5 | `honcho-ai` | 対話的なユーザーモデリング＋セッション単位の文脈 |
| **OpenViking** | 自前運用 | 無料 | 6 | `openviking` とサーバー | ファイルシステム風の階層＋段階的な読み込み |
| **Mem0** | クラウド／自前運用 | 無料／有料 | 4 | `mem0ai` | サーバー側の LLM による抽出＋自前運用／OSS のモード |
| **Hindsight** | クラウド／ローカル | 無料／有料 | 3 | `hindsight-client` | 知識グラフ＋まとめ直し |
| **Holographic** | ローカル | 無料 | 2 | なし | HRR の代数＋信頼度の採点 |
| **RetainDB** | クラウド | 月額 $20 | 10 | `requests` | 差分圧縮 |
| **ByteRover** | ローカル／クラウド | 無料／有料 | 3 | `brv` CLI | 圧縮前の抽出 |
| **Supermemory** | クラウド／自前運用 | 無料／有料 | 4 | `supermemory` | 文脈の仕切り＋セッションのグラフ取り込み＋複数コンテナ |
| **Memori** | クラウド | 無料／有料 | 5 | `hermes-memori` | ツールを踏まえた記憶＋構造のある呼び出し |

## プロファイルごとの分離 {#profile-isolation}

各プロバイダのデータは、[プロファイル](/hermes/docs/user-guide/profiles/) ごとに分けられます。

- **手元に保存するプロバイダ**（Holographic、ByteRover）は、プロファイルごとに異なる `$HERMES_HOME/` のパスを使います
- **設定ファイルを使うプロバイダ**（Honcho、Mem0、Hindsight、Supermemory）は設定を `$HERMES_HOME/` に置くので、プロファイルごとに別々の資格情報を持ちます
- **クラウドのプロバイダ**（RetainDB）は、プロファイル単位のプロジェクト名を自動で作ります
- **環境変数を使うプロバイダ**（OpenViking）は、プロファイルごとの `.env` ファイルで設定します

## 記憶プロバイダを自分で作る {#building-a-memory-provider}

作り方は [開発者ガイド: 記憶プロバイダのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) を参照してください。
