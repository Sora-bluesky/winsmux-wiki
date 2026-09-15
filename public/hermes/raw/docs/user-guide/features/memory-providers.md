---
title: "記憶プロバイダー"
description: "外部の記憶プロバイダーのプラグイン — Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover、Supermemory"
upstream_path: user-guide/features/memory-providers.md
upstream_blob: 9eeaabeae829ba983ae163db4a413e7df7a3aad9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers
---

# 記憶プロバイダー {#memory-providers}

Hermes Agent には、外部の記憶プロバイダーのプラグインが 8 つ同梱されています。内蔵の MEMORY.md と USER.md を超えて、セッションをまたいで残る知識をエージェントに持たせるものです。外部プロバイダーは一度に**1 つ**しか動かせません。内蔵の記憶は、それと並んで常に動いています。

## すぐに使い始める {#quick-start}

```bash
hermes memory setup      # interactive picker + configuration
hermes memory status     # check what's active
hermes memory off        # disable external provider
```

動かす記憶プロバイダーは、`hermes plugins` → Provider Plugins → Memory Provider からも選べます。

あるいは `~/.hermes/config.yaml` に手で設定します。

```yaml
memory:
  provider: openviking   # or honcho, mem0, hindsight, holographic, retaindb, byterover, supermemory
```

## しくみ {#how-it-works}

記憶プロバイダーが動いているとき、Hermes は自動で次のことを行います。

1. **プロバイダーの文脈をシステムプロンプトへ差し込む**（そのプロバイダーが知っていること）
2. **関係のありそうな記憶を各ターンの前に先読みする**（裏側で、処理を止めずに）
3. **会話のターンをプロバイダーへ同期する**（応答のたびに）
4. **セッションの終了時に記憶を抽出する**（対応しているプロバイダーの場合）
5. **内蔵の記憶への書き込みを外部プロバイダーにも写す**
6. **プロバイダーごとのツールを追加する**（エージェントが記憶を検索・保存・管理できるように）

内蔵の記憶（MEMORY.md と USER.md）は、これまでとまったく同じように動き続けます。外部プロバイダーは足し算です。

## 使えるプロバイダー {#available-providers}

### Honcho {#honcho}

AI に向いた、セッションをまたぐ利用者のモデリング。対話的な推論、セッション範囲の文脈の差し込み、意味検索、そして残り続ける結論を備えます。基本の文脈には、利用者の像とピアのカードに加えて、セッションの要約も含まれるようになったので、エージェントはすでに話した内容を把握できます。

| | |
|---|---|
| **向いている用途** | セッションをまたぐ文脈を持つ複数エージェントの仕組み、利用者とエージェントのすり合わせ |
| **必要なもの** | `pip install honcho-ai` と [API キー](https://app.honcho.dev)、または自己ホストの環境 |
| **データの置き場所** | Honcho Cloud または自己ホスト |
| **費用** | Honcho の料金（クラウド）／無料（自己ホスト） |

**ツール（5 つ）:** `honcho_profile`（ピアのカードの読み書き）、`honcho_search`（意味検索）、`honcho_context`（セッションの文脈 — 要約、像、カード、メッセージ）、`honcho_reasoning`（LLM がまとめたもの）、`honcho_conclude`（結論の作成と削除）

**構成:** 文脈の差し込みは 2 層です。基本の層（セッションの要約、像、ピアのカード。`contextCadence` の間隔で更新）と、対話的な補足（LLM の推論。`dialecticCadence` の間隔で更新）です。対話的な補足は、基本の文脈があるかどうかで、冷えた状態向けの指示文（利用者に関する一般的な事実）と、温まった状態向けの指示文（セッション範囲の文脈）を自動で選び分けます。

**互いに独立した 3 つの設定つまみ**が、費用と深さを別々に制御します。

- `contextCadence` — 基本の層が更新される間隔（API の呼び出し頻度）
- `dialecticCadence` — 対話用の LLM が走る間隔（LLM の呼び出し頻度）
- `dialecticDepth` — 対話 1 回あたりの `.chat()` の回数（1〜3。推論の深さ）

自動で差し込まれる対話的な補足は、問い合わせの長さに応じて推論の強さも変えます（長い問い合わせほど深く、上限は `reasoningLevelCap`）。[問い合わせに応じた推論の強さ](/hermes/docs/user-guide/features/honcho/#query-adaptive-reasoning-level)を参照してください。

**設定の案内:**
```bash
hermes memory setup        # select "honcho" — runs the Honcho-specific post-setup
```

以前からある `hermes honcho setup` コマンドも動きます（いまは `hermes memory setup` へ回されます）。ただし、Honcho を記憶プロバイダーとして選んだあとにしか登録されません。

**画面の無い端末やリモートの端末では:** ブラウザーの無い環境（SSH、リモートの仮想マシン）でクラウドの認証を行うには、案内の認証方法の質問で **device** を選んでください。CLI が短いコードと確認用のリンクを表示するので、別の端末のブラウザーでそのリンクを開いて承認すれば設定が終わります。API キーをコピーして貼る必要はありません。使えるブラウザーが手元に見つからない場合、案内は自動でこの選択肢を既定にします。

**設定ファイル:** `$HERMES_HOME/honcho.json`（プロファイル内）または `~/.honcho/config.json`（全体）。解決の順番は `$HERMES_HOME/honcho.json` > `~/.hermes/honcho.json` > `~/.honcho/config.json` です。[設定の早見表](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/honcho/README.md)と [Honcho の連携ガイド](https://docs.honcho.dev/v3/guides/integrations/hermes)を参照してください。

<details>
<summary>設定の早見表（全項目）</summary>

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `apiKey` | -- | [app.honcho.dev](https://app.honcho.dev) で取得する API キー |
| `baseUrl` | -- | 自己ホストの Honcho の基準 URL |
| `peerName` | -- | 利用者側のピアの名前 |
| `aiPeer` | host key | AI 側のピアの名前（プロファイルごとに 1 つ） |
| `workspace` | host key | 共有する作業空間の ID |
| `contextTokens` | `null` (uncapped) | ターンごとに自動で差し込む文脈のトークン予算。単語の切れ目で打ち切ります |
| `contextCadence` | `1` | `context()` の API 呼び出し（基本の層の更新）の最小間隔ターン数 |
| `dialecticCadence` | `2` | `peer.chat()` の LLM 呼び出しの最小間隔ターン数。1〜5 を推奨します。`hybrid` と `context` のモードにのみ効きます |
| `dialecticDepth` | `1` | 対話 1 回あたりの `.chat()` の回数。1〜3 に丸められます。1 回目は冷えた／温まった指示文、2 回目は自己点検、3 回目はすり合わせです |
| `dialecticDepthLevels` | `null` | 回ごとの推論の強さを並べた任意の配列。例: `["minimal", "low", "medium"]`。比例配分の既定を上書きします |
| `dialecticReasoningLevel` | `'low'` | 基準となる推論の強さ: `minimal`、`low`、`medium`、`high`、`max` |
| `dialecticDynamic` | `true` | `true` のとき、モデルがツールの引数で呼び出しごとに推論の強さを上書きできます |
| `dialecticMaxChars` | `600` | システムプロンプトへ差し込む対話結果の最大文字数 |
| `recallMode` | `'hybrid'` | `hybrid`（自動の差し込みとツール）、`context`（差し込みのみ）、`tools`（ツールのみ） |
| `writeFrequency` | `'async'` | メッセージを書き出す時機: `async`（裏のスレッド）、`turn`（同期）、`session`（終了時にまとめて）、または整数 N |
| `saveMessages` | `true` | メッセージを Honcho の API に残すかどうか |
| `observationMode` | `'directional'` | `directional`（全部有効）または `unified`（共有の観測）。`observation` オブジェクトで上書きできます |
| `messageMaxChars` | `25000` | メッセージ 1 通の最大文字数（超えると分割されます） |
| `dialecticMaxInputChars` | `10000` | `peer.chat()` へ渡す対話用の問い合わせの最大文字数 |
| `sessionStrategy` | `'per-directory'` | `per-directory`、`per-repo`、`per-session`、`global` |
| `pinUserPeer` | `false` | ゲートウェイ専用。`true` のとき、エージェント以外のゲートウェイ利用者はすべて `peerName` にまとめられます。この固定はすべての別名より優先されます |
| `userPeerAliases` | `{}` | ゲートウェイ専用。実行時の ID をピアに対応づけます（`{"7654321": "alice"}`）。多対一です |
| `runtimePeerPrefix` | `""` | ゲートウェイ専用。別名に一致しない実行時の ID に名前空間を付けます（`telegram_7654321`） |

</details>

<details>
<summary>最小の honcho.json（クラウド）</summary>

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
<summary>最小の honcho.json（自己ホスト）</summary>

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
以前 `hermes honcho setup` を使っていた場合、設定もサーバー側のデータもそのまま残っています。設定の案内からもう一度有効にするか、`memory.provider: honcho` を手で設定すれば、新しい仕組みで動き出します。
:::

**複数ピアの設定:**

Honcho は会話を「メッセージをやり取りするピア」としてモデル化します。Hermes のプロファイルごとに、利用者側のピアが 1 つと AI 側のピアが 1 つあり、すべてが 1 つの作業空間を共有します。作業空間は共有の環境です。利用者側のピアはプロファイルをまたいで共通で、AI 側のピアはそれぞれ別の人格です。AI 側のピアはそれぞれ自分の観測から独立した像とカードを組み立てるので、同じ利用者に対しても `coder` のプロファイルはコード寄りのまま、`writer` のプロファイルは編集寄りのままでいられます。

対応づけは次のとおりです。

| 概念 | 何を指すか |
|---------|-----------|
| **作業空間** | 共有の環境です。1 つの作業空間の下にあるすべての Hermes のプロファイルは、同じ利用者の人格を見ます。 |
| **利用者側のピア**（`peerName`） | 人間です。作業空間の中のプロファイルをまたいで共有されます。 |
| **AI 側のピア**（`aiPeer`） | Hermes のプロファイルごとに 1 つです。ホストキー `hermes` が既定で、それ以外は `hermes.<profile>` になります。 |
| **観測** | 誰のメッセージから何をモデル化するかを決める、ピアごとの切り替えです。`directional`（既定。4 つとも有効）または `unified`（観測者 1 人にまとめる）。 |

### 新しいプロファイルと、新しい Honcho のピア {#new-profile-fresh-honcho-peer}

```bash
hermes profile create coder --clone
```

`--clone` は `honcho.json` に `hermes.coder` のホストの区画を作り、`aiPeer: "coder"`、共有の `workspace`、引き継いだ `peerName`、`recallMode`、`writeFrequency`、`observation` などを設定します。AI 側のピアは先に Honcho 上で作られるので、最初のメッセージの前から存在します。

### すでにあるプロファイルに、Honcho のピアを埋める {#existing-profiles-backfill-honcho-peers}

```bash
hermes honcho sync
```

すべての Hermes のプロファイルを走査し、ホストの区画が無いものには作り、既定の `hermes` の区画から設定を引き継ぎ、新しい AI 側のピアを先に作ります。何度実行しても結果は同じで、すでにホストの区画があるプロファイルは飛ばします。

### プロファイルごとの観測 {#per-profile-observation}

ホストの区画はそれぞれ独立に観測の設定を上書きできます。例として、AI 側のピアが利用者を観測するが自分自身はモデル化しない、コード寄りのプロファイルを挙げます。

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
| `observeMe` | Honcho が、そのピア自身のメッセージからそのピアの像を組み立てます |
| `observeOthers` | そのピアが、もう一方のピアのメッセージを観測します（ピアをまたぐ推論の材料になります） |

`observationMode` で選べる組み合わせです。

- **`"directional"`**（既定） — 4 つの旗すべてが有効です。互いに完全に観測し合い、ピアをまたぐ対話が働きます。
- **`"unified"`** — 利用者側は `observeMe: true`、AI 側は `observeOthers: true`、残りは無効です。観測者を 1 人にまとめる形で、AI は利用者をモデル化しますが自分自身はモデル化せず、利用者側のピアは自分だけをモデル化します。

[Honcho のダッシュボード](https://app.honcho.dev)でサーバー側に設定した切り替えは、手元の既定より優先されます。セッションの開始時に手元へ同期されます。

観測についての全項目は [Honcho のページ](/hermes/docs/user-guide/features/honcho/#observation-directional-vs-unified)を参照してください。

### ゲートウェイでの人格の対応づけ {#gateway-identity-mapping}

上のピアの考え方は、CLI、TUI、デスクトップのセッションに当てはまり、どの会話も `peerName` に解決されます。[ゲートウェイ](/hermes/docs/developer-guide/gateway-internals/)ではもう 1 つの軸が加わります。利用者はそれぞれの基盤の実行時 ID（Telegram の UID、Discord の snowflake、Slack の利用者）で現れ、3 つのキーが、その ID をどのピアに解決するかを決めます。

| キー | 効果 |
|-----|--------|
| `pinUserPeer: true` | エージェント以外のゲートウェイ利用者はすべて `peerName` にまとめられます。この固定は最初に確認されるので、すべての別名より優先されます。利用者側の人格を個別のピアにする必要がまったく無いときにだけ選んでください |
| `userPeerAliases` | 特定の実行時 ID をピアに対応づけます（`{"7654321": "alice"}`）。別々の人格を振り分けるのはここです。それぞれ自分のピアを持つエージェントも含みます |
| `runtimePeerPrefix` | 対応づけの無い実行時 ID に名前空間を付けるので（`telegram_7654321`）、同じ形の ID を使う基盤どうしが衝突しません |

ゲートウェイの外では、これらのキーは何もしません。`hermes memory setup` は、つながっているゲートウェイの基盤を見つけたときだけ、これらを尋ねます。解決の順序と設定の流れについては [Honcho のページ](/hermes/docs/user-guide/features/honcho/#gateway-identity-mapping)を参照してください。

<details>
<summary>honcho.json の全項目の例（複数プロファイル）</summary>

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

[設定の早見表](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/honcho/README.md)と [Honcho の連携ガイド](https://docs.honcho.dev/v3/guides/integrations/hermes)を参照してください。

---

### OpenViking {#openviking}

Volcengine（ByteDance）による文脈のデータベースです。ファイルシステム風の知識の階層、段階的な取り出し、6 分類への自動的な記憶の抽出を備えます。

| | |
|---|---|
| **向いている用途** | 構造をたどって見て回れる、自己ホストの知識管理 |
| **必要なもの** | OpenViking を初期化し、検証し、動かしていること |
| **データの置き場所** | 自己ホスト（手元またはクラウド） |
| **費用** | 無料（オープンソース、AGPL-3.0） |

**ツール（6 つ）:** `viking_search`（意味検索）、`viking_read`（段階的に: 要旨・概観・全文）、`viking_browse`（ファイルシステム風の移動）、`viking_remember`（事実の保存）、`viking_forget`（`viking://` の URI をそのまま指定して記憶のファイルを削除）、`viking_add_resource`（URL や文書の取り込み）

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

`hermes memory setup` は、
`~/.openviking/ovcli.conf` にある接続の値をそのまま使うか、複製できます。手で設定する場合は、動いているプロファイルの `.env` ファイルを使います。
既定のプロファイルなら `~/.hermes/.env`、名前付きのプロファイルなら
`~/.hermes/profiles/<profile>/.env` です。

```text
OPENVIKING_ENDPOINT=http://127.0.0.1:1933
# OPENVIKING_API_KEY=...
# OPENVIKING_ACCOUNT=default
# OPENVIKING_USER=default
```

OpenViking のサーバー側の設定は `ov.conf` にあります（`--config`、
`OPENVIKING_CONFIG_FILE`、または `~/.openviking/ov.conf`）。クライアント側の接続の値は
`ovcli.conf` にあります（`OPENVIKING_CLI_CONFIG_FILE` または
`~/.openviking/ovcli.conf`）。

**主な特徴:**
- 段階的な文脈の読み込み: L0（約 100 トークン）→ L1（約 2k）→ L2（全文）
- セッションの確定時に記憶を自動抽出（人物像、好み、実体、出来事、事例、型）
- 階層をたどって知識を見て回るための `viking://` の URI 形式

`OPENVIKING_ACCOUNT` と `OPENVIKING_USER` は、手元や信頼できる環境で使います。
ピアの人格は任意です。既定では、Hermes はピアの ID を送らず、明示的な記憶を
`viking://user/<user>/memories/...` に書きます。設定の案内でピアの ID を
尋ねることはありません。アシスタント用の文脈を分けたい場合は、`config.yaml` に
`memory.openviking.agent: work-assistant` を設定してください。

すでに空でないピアの設定がある場合は、ピア範囲での書き込みと呼び出しが保たれます。
これには `OPENVIKING_AGENT` や、連携する OpenViking の設定にある `actor_peer_id`、
以前からの `agent_id` が含まれます。既存の記憶が移動したり消えたりすることはありません。
ピアの ID が無い場合、既定の検索は利用者の記憶と、同じ OpenViking の利用者の下にある
既存のピアの記憶を対象にします。古いピアの記憶も、いまのパスのまま検索できます。
どの記憶が返るかは、順位付けと件数の上限で決まります。
以前のピア範囲での書き込みに戻したい場合は `memory.openviking.agent: hermes` を設定してください。
この変更より前に利用者の範囲で書かれた記憶はそこに残り、検索もできます。
この設定が変えるのは今後の書き込みで、既存の記憶の場所ではありません。

Hermes は OpenViking への要求に `User-Agent: openviking-memory-hermes/<version>` を
付けます。これは標準的な実行環境の識別子で、利用者ごとの識別子は含みませんし、
要求が余分に増えることもありません。

---

### Mem0 {#mem0}

サーバー側で LLM が事実を抽出し、意味検索、順位の付け直し、重複の自動除去を行います。つなぎ方は 3 通りあります。**Platform**（Mem0 Cloud）、**自己ホストのダッシュボード**（Docker で自分が動かす Mem0 のサーバー）、**OSS**（自前の LLM とベクトルストアを使って、同じプロセス内で動かす Mem0）です。

| | |
|---|---|
| **向いている用途** | 手のかからない記憶の管理 — 抽出は Mem0 が自動でやります |
| **必要なもの** | `pip install mem0ai` と API キー（platform）、動いている Mem0 のサーバー（自己ホストのダッシュボード）、または LLM とベクトルストア（OSS） |
| **データの置き場所** | Mem0 Cloud（platform）、自分の Mem0 のサーバー（自己ホストのダッシュボード）、または同じプロセス内（OSS） |
| **費用** | Mem0 の料金（platform）／無料（自己ホストまたは OSS） |

**ツール（4 つ）:** `mem0_search`（意味検索。platform では順位の付け直しも任意で使えます。既定では無効）、`mem0_add`（事実をそのまま保存）、`mem0_update`（ID を指定して更新）、`mem0_delete`（ID を指定して削除）

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

ファイルを書かずに内容だけ確かめるには、次のようにします。
```bash
hermes memory setup mem0 --mode oss --oss-llm-key sk-... --dry-run
```

**設定（自己ホストのダッシュボード）:** Docker で自分が動かす Mem0 のサーバー（ダッシュボードの REST API）につなぎます。

```bash
hermes memory setup    # select "mem0" → "Self-hosted server"
# Or via flags:
hermes memory setup mem0 --mode selfhosted --host http://localhost:8888 --api-key your-admin-api-key
```

手で設定することもできます。環境変数として書くなら、次のようにします。

```bash
echo "MEM0_HOST=http://localhost:8888" >> ~/.hermes/.env
echo "MEM0_API_KEY=your-admin-api-key" >> ~/.hermes/.env
```

`mem0.json` に書くなら、次のようにします。

```json
{ "host": "http://localhost:8888", "api_key": "your-admin-api-key" }
```

プラグインは `X-API-Key` で認証し、サーバーの `/search` と `/memories` の経路を使います。`api_key` は任意です（`AUTH_DISABLED` のサーバーのときだけ省いてください）。`mode: oss` は設定しないでください。`host` より優先されてしまいます。

**設定ファイル:** `$HERMES_HOME/mem0.json`（挙動の設定）。`~/.hermes/.env` に置くのは、秘密である `MEM0_API_KEY` だけです。

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `mode` | `platform` | `platform`（Mem0 Cloud）または `oss`（自分で管理し、同じプロセス内で動かす） |
| `host` | — | 自己ホストの Mem0 のサーバーの URL（Docker のダッシュボード）。`X-API-Key` を付けて HTTP でつなぎます。`mode: oss` と併用しないでください |
| `user_id` | `hermes-user` | 利用者の識別子 |
| `agent_id` | `hermes` | エージェントの識別子 |
| `rerank` | `false` | 検索結果を関連度で並べ直します（platform のみ） |
| `sync_max_chars` | `450` | 各ターンを事実の抽出へ送る前にかける、メッセージ 1 通あたりの文字数の上限。最後の文の切れ目で切ります。既定値は 512 トークンの埋め込みモデル（Ollama の `bge-small-zh-v1.5` や `all-minilm`）に合わせてあります。`text-embedding-3-small`、`jina-embeddings-v3`、`bge-m3` のような 8k トークンの埋め込みモデルを使うなら、`6000` などへ上げてください |

**OSS で対応しているもの:**

| 部品 | 対応 |
|-----------|-----------|
| LLM | openai, ollama |
| 埋め込み | openai, ollama |
| ベクトルストア | qdrant (local/server), pgvector |

**モードの切り替え:** `hermes memory setup mem0 --mode <platform|selfhosted|oss>` を実行し直すか、`mem0.json` を直接編集してください。

---

### Hindsight {#hindsight}

知識グラフ、実体の名寄せ、複数の戦略を使った取り出しを備えた長期記憶です。`hindsight_reflect` ツールは、記憶をまたいだ統合を行うもので、他のプロバイダーにはありません。会話のターン（ツール呼び出しを含みます）を丸ごと自動で保持し、セッション単位で文書を追跡します。

| | |
|---|---|
| **向いている用途** | 実体どうしの関係をたどる、知識グラフに基づく呼び出し |
| **必要なもの** | クラウド: [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) の API キー。ローカル: LLM の API キー（OpenAI、Groq、OpenRouter など） |
| **データの置き場所** | Hindsight Cloud または手元に組み込まれた PostgreSQL |
| **費用** | Hindsight の料金（クラウド）または無料（ローカル） |

**ツール:** `hindsight_retain`（実体の抽出を伴う保存）、`hindsight_recall`（複数戦略での検索）、`hindsight_reflect`（記憶をまたいだ統合）

**設定:**
```bash
hermes memory setup    # select "hindsight"
# Or manually:
hermes config set memory.provider hindsight
echo "HINDSIGHT_API_KEY=your-key" >> ~/.hermes/.env
```

設定の案内は依存関係を自動で導入し、選んだモードに必要なものだけを入れます（クラウドなら `hindsight-client`、ローカルなら `hindsight-all`）。`hindsight-client >= 0.4.22` が必要です（古ければセッションの開始時に自動で上げます）。

**ローカルモードの画面:** `hindsight-embed -p hermes ui start`

**設定ファイル:** `$HERMES_HOME/hindsight/config.json`

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `mode` | `cloud` | `cloud` または `local` |
| `bank_id` | `hermes` | 記憶の保管庫の識別子 |
| `recall_budget` | `mid` | 呼び出しの丁寧さ: `low` / `mid` / `high` |
| `memory_mode` | `hybrid` | `hybrid`（文脈とツール）、`context`（自動の差し込みのみ）、`tools`（ツールのみ） |
| `auto_retain` | `true` | 会話のターンを自動で保持します |
| `auto_recall` | `true` | 各ターンの前に記憶を自動で呼び出します |
| `retain_async` | `true` | 保持の処理をサーバー側で非同期に行います |
| `retain_context` | `conversation between Hermes Agent and the User` | 保持した記憶に付ける文脈のラベル |
| `retain_tags` | — | 保持した記憶に付ける既定のタグ。呼び出しごとのツールのタグと合わさります |
| `retain_source` | — | 保持した記憶に付ける任意の `metadata.source` |
| `retain_user_prefix` | `User` | 自動で保持した記録の中で、利用者のターンの前に置くラベル |
| `retain_assistant_prefix` | `Assistant` | 自動で保持した記録の中で、アシスタントのターンの前に置くラベル |
| `recall_tags` | — | 呼び出し時に絞り込むタグ |

設定できる項目の全容は[プラグインの README](https://github.com/NousResearch/hermes-agent/blob/main/plugins/memory/hindsight/README.md) を参照してください。

---

### Holographic {#holographic}

手元の SQLite に事実を貯める仕組みです。FTS5 の全文検索、信頼度の採点、そして組み合わせた代数的な問い合わせのための HRR（Holographic Reduced Representations）を備えます。

| | |
|---|---|
| **向いている用途** | 外部に依存せず、手元だけで高度な取り出しを行う記憶 |
| **必要なもの** | 何も要りません（SQLite は常に使えます）。HRR の代数を使うなら NumPy は任意で入れてください。 |
| **データの置き場所** | 手元の SQLite |
| **費用** | 無料 |

**ツール:** `fact_store`（9 つの操作: add、search、probe、related、reason、contradict、update、remove、list）、`fact_feedback`（役に立った・立たなかったの評価で、信頼度の採点を鍛えます）

**設定:**
```bash
hermes memory setup    # select "holographic"
# Or manually:
hermes config set memory.provider holographic
```

**設定ファイル:** `config.yaml` の `plugins.hermes-memory-store` の下

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `db_path` | `$HERMES_HOME/memory_store.db` | SQLite のデータベースのパス |
| `auto_extract` | `false` | セッションの終了時に事実を自動抽出します |
| `default_trust` | `0.5` | 既定の信頼度（0.0〜1.0） |

**ここにしかない機能:**
- `probe` — 実体を指定した代数的な呼び出し（ある人や物についての事実をすべて）
- `reason` — 複数の実体にまたがる AND の組み合わせ問い合わせ
- `contradict` — 矛盾する事実の自動検出
- 非対称なフィードバックによる信頼度の採点（役に立てば +0.05、立たなければ -0.10）

---

### RetainDB {#retaindb}

ハイブリッド検索（ベクトル + BM25 + 順位の付け直し）、7 種類の記憶、差分圧縮を備えたクラウドの記憶 API です。

| | |
|---|---|
| **向いている用途** | すでに RetainDB の基盤を使っているチーム |
| **必要なもの** | RetainDB のアカウントと API キー |
| **データの置き場所** | RetainDB Cloud |
| **費用** | 月額 20 ドル |

**ツール（10 個）:** `retaindb_profile`（利用者の像）、`retaindb_search`（意味検索）、`retaindb_context`（作業に関係する文脈）、`retaindb_remember`（種類と重要度を付けて保存）、`retaindb_forget`（記憶の削除）、そしてファイル関連の `retaindb_upload_file`、`retaindb_list_files`、`retaindb_read_file`、`retaindb_ingest_file`、`retaindb_delete_file`

**設定:**
```bash
hermes memory setup    # select "retaindb"
# Or manually:
hermes config set memory.provider retaindb
echo "RETAINDB_API_KEY=your-key" >> ~/.hermes/.env
```

---

### ByteRover {#byterover}

`brv` の CLI を通した持続する記憶です。階層的な知識の木と、段階的な取り出し（あいまいな文字列検索から LLM による検索へ）を備えます。手元を基本としつつ、クラウドとの同期も任意で使えます。

| | |
|---|---|
| **向いている用途** | 持ち運べて手元が基本の記憶を、CLI で扱いたい開発者 |
| **必要なもの** | ByteRover の CLI（`npm install -g byterover-cli` または[導入スクリプト](https://byterover.dev)） |
| **データの置き場所** | 手元（既定）または ByteRover Cloud（任意の同期） |
| **費用** | 無料（手元）または ByteRover の料金（クラウド） |

**ツール:** `brv_query`（知識の木を検索）、`brv_curate`（事実・判断・型を保存）、`brv_status`（CLI のバージョンと木の統計）

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
- 圧縮の直前に自動で抽出（文脈の圧縮で捨てられる前に、気づきを残します）
- 知識の木は `$HERMES_HOME/byterover/` に置かれます（プロファイル単位）
- SOC2 Type II 認証を受けたクラウド同期（任意）

---

### Supermemory {#supermemory}

意味に基づく長期記憶です。利用者の像の呼び出し、意味検索、明示的な記憶のツール、そしてターンごとの会話の記録（セッションごと、4 時間の区切りごとに 1 つの文書）を備えます。

| | |
|---|---|
| **向いている用途** | 利用者の像づくりとセッション単位のグラフ構築を伴う、意味に基づく呼び出し |
| **必要なもの** | `pip install supermemory` と[クラウドの API キー](http://app.supermemory.ai/integrations?connect=hermes)、または[自己ホストのサーバー](https://supermemory.ai/docs/self-hosting/overview) |
| **データの置き場所** | Supermemory Cloud または自己ホスト |
| **費用** | Supermemory の料金（クラウド）／無料（自己ホスト） |

**ツール:** `supermemory_store`（明示的な記憶の保存）、`supermemory_search`（意味の近さでの検索）、`supermemory_forget`（ID かいちばん近い問い合わせで忘れる）、`supermemory_profile`（残り続ける像と最近の文脈）

**設定:**
```bash
hermes memory setup    # select "supermemory"
# Or manually:
hermes config set memory.provider supermemory
echo 'SUPERMEMORY_API_KEY=***' >> ~/.hermes/.env
```

自己ホストの設定は次のとおりです。

```bash
npx supermemory local
```

`hermes memory setup` を実行する前に、
`$HERMES_HOME/supermemory.json` に `base_url` を設定してください。

```json
{
  "base_url": "http://localhost:6767"
}
```

そのうえで `hermes memory setup` を実行し、手元のサーバーが表示した API キーを
入力します。先に接続先を設定しておくと、設定時の接続確認も手元に留まります。

**設定ファイル:** `$HERMES_HOME/supermemory.json`

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `base_url` | `https://api.supermemory.ai` | ホスト型または自己ホストの Supermemory の API のつなぎ先。`SUPERMEMORY_BASE_URL` より優先されます。 |
| `container_tag` | `hermes` | 検索と書き込みに使う入れ物のタグ。プロファイル単位のタグにするための `{identity}` の差し込みに対応します。 |
| `auto_recall` | `true` | ターンの前に、関係のある記憶の文脈を差し込みます |
| `auto_capture` | `true` | 応答のたびに、整理した利用者とアシスタントのターンを保存します |
| `max_recall_results` | `10` | 文脈に組み込む、呼び出した項目の最大数 |
| `profile_frequency` | `50` | 最初のターンと、N ターンごとに像の事実を含めます |
| `capture_mode` | `all` | 既定では、ごく短いターンや取るに足らないターンを飛ばします |
| `search_mode` | `hybrid` | 検索のしかた: `hybrid`、`memories`、`documents` |
| `api_timeout` | `5.0` | SDK の要求の待ち時間の上限 |

**環境変数:** `SUPERMEMORY_API_KEY`（必須）、`SUPERMEMORY_BASE_URL`（`base_url` が設定されていないときの互換用の受け皿）、`SUPERMEMORY_CONTAINER_TAG`（設定を上書きします）。

基準 URL の優先順位は `supermemory.json` → `SUPERMEMORY_BASE_URL` → `https://api.supermemory.ai` です。SDK の操作と、設定と状態の確認は、すべてこの解決されたつなぎ先を使います。

**主な特徴:**
- 文脈の自動的な囲い込み — 保存するターンから呼び出した記憶を取り除き、記憶が記憶を汚す循環を防ぎます
- ターンごとの記録 — 終わったターンをその都度書き込みます。セッションごと、4 時間の区切りごとに 1 つの文書になります
- 書き込みに失敗したターンは、次のターン、セッション終了、`/reset`、終了処理のいずれかで再試行されます（少なくとも 1 回は届きます）
- 端から端まで自己ホストで完結する経路 — SDK と接続確認の要求が、同じ設定のつなぎ先を使います
- 最初のターンと、指定した間隔ごとに、像の事実を差し込みます
- **プロファイル単位の入れ物** — `container_tag` に `{identity}` を使うと（例: `hermes-{identity}` → `hermes-coder`）、Hermes のプロファイルごとに記憶を分けられます
- **複数の入れ物のモード** — `enable_custom_container_tags` を有効にして `custom_containers` の一覧を書くと、エージェントが名前を付けた入れ物をまたいで読み書きできます。自動の操作は主な入れ物に留まります。

<details>
<summary>複数の入れ物の例</summary>

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

Memori Cloud を使う、構造化された長期記憶です。終わったターンを裏で取り込み、ツールを踏まえたターンの文脈を持ち、事実・要約・利用枠・登録・フィードバックのための明示的な呼び出しのツールを備えます。

| | |
|---|---|
| **向いている用途** | プロジェクトとセッションの帰属を構造化したうえで、エージェント自身が呼び出しを制御する使い方 |
| **必要なもの** | `pip install hermes-memori` と `hermes-memori install`、そして [Memori の API キー](https://app.memorilabs.ai/signup) |
| **データの置き場所** | Memori Cloud |
| **費用** | Memori の料金 |

**ツール:** `memori_recall`（長期記憶の検索）、`memori_recall_summary`（要約した文脈）、`memori_quota`（利用量と枠）、`memori_signup`（登録メールの依頼）、`memori_feedback`（連携についての意見の送信）

**設定:**
```bash
pip install hermes-memori
hermes-memori install
hermes config set memory.provider memori
hermes memory setup
```

---

## プロバイダーの比較 {#provider-comparison}

| プロバイダー | 置き場所 | 費用 | ツール | 依存 | 独自の特徴 |
|----------|---------|------|-------|-------------|----------------|
| **Honcho** | クラウド | 有料 | 5 | `honcho-ai` | 対話的な利用者のモデリングとセッション範囲の文脈 |
| **OpenViking** | 自己ホスト | 無料 | 6 | `openviking` とサーバー | ファイルシステム風の階層と段階的な読み込み |
| **Mem0** | クラウド／自己ホスト | 無料／有料 | 4 | `mem0ai` | サーバー側の LLM 抽出と、自己ホスト／OSS のモード |
| **Hindsight** | クラウド／ローカル | 無料／有料 | 3 | `hindsight-client` | 知識グラフと reflect による統合 |
| **Holographic** | ローカル | 無料 | 2 | 無し | HRR の代数と信頼度の採点 |
| **RetainDB** | クラウド | 月額 20 ドル | 10 | `requests` | 差分圧縮 |
| **ByteRover** | ローカル／クラウド | 無料／有料 | 3 | `brv` の CLI | 圧縮の直前の抽出 |
| **Supermemory** | クラウド／自己ホスト | 無料／有料 | 4 | `supermemory` | 文脈の囲い込み、セッションのグラフ取り込み、複数の入れ物 |
| **Memori** | クラウド | 無料／有料 | 5 | `hermes-memori` | ツールを踏まえた記憶と、構造化された呼び出し |

## プロファイルごとの分離 {#profile-isolation}

各プロバイダーのデータは、[プロファイル](/hermes/docs/user-guide/profiles/)ごとに分けられます。

- **手元に保存するプロバイダー**（Holographic、ByteRover）は `$HERMES_HOME/` のパスを使い、これはプロファイルごとに異なります
- **設定ファイルを使うプロバイダー**（Honcho、Mem0、Hindsight、Supermemory）は設定を `$HERMES_HOME/` に置くので、プロファイルごとに自分の認証情報を持ちます
- **クラウドのプロバイダー**（RetainDB）は、プロファイル単位のプロジェクト名を自動で導きます
- **環境変数を使うプロバイダー**（OpenViking）は、プロファイルごとの `.env` ファイルで設定します

## 記憶プロバイダーを作る {#building-a-memory-provider}

自分で作る方法は[開発者ガイド: 記憶プロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)を参照してください。
