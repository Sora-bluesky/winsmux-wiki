---
title: "Honcho — Hermes の Honcho メモリを設定し、うまく動かないときに直す"
description: "Hermes の Honcho メモリを設定し、うまく動かないときに直す"
upstream_path: user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-honcho.md
upstream_blob: 2bffbcdb4c0a1ee93cbd83652676c875f5e6dc34
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-honcho
---

# Honcho {#honcho}

Hermes の Honcho メモリを設定し、うまく動かないときに直します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/autonomous-ai-agents/honcho` で入れます |
| パス | `optional-skills/autonomous-ai-agents\honcho` |
| バージョン | `2.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Honcho`, `Memory`, `Profiles`, `Observation`, `Dialectic`, `User-Modeling`, `Session-Summary` |
| 関連 skill | [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Hermes のための Honcho メモリ {#honcho-memory-for-hermes}

Honcho は、AI に合わせて作られた、会話をまたいで利用者像を組み立てるしくみです。何度も会話するうちに利用者がどんな人かを学び、Hermes のプロファイルごとに固有の peer（相手役）を持たせながら、利用者についての見方は一つにまとめます。

## こんなときに使います {#when-to-use}

- Honcho を設定するとき（クラウド版でも自分で立てた場合でも）
- 記憶が効かない、peer が同期しないといったときに原因を探すとき
- エージェントごとに Honcho の peer を持たせた、複数プロファイルの構成を作るとき
- 観測・呼び出し・dialectic の深さ・書き込み頻度の設定を調整するとき
- Honcho の 5 つのツールが何をするもので、いつ使うのかを知りたいとき
- コンテキストの上限やセッション要約の差し込みを設定するとき

## 導入 {#setup}

### クラウド版（app.honcho.dev） {#cloud-apphonchodev}

```bash
hermes memory setup honcho
# select "cloud", paste API key from https://app.honcho.dev
```

### 自分で立てる場合 {#self-hosted}

```bash
hermes memory setup honcho
# select "local", enter base URL (e.g. http://localhost:8000)
```

参考: https://docs.honcho.dev/v3/guides/integrations/hermes#running-honcho-locally-with-hermes

### 確認 {#verify}

```bash
hermes honcho status    # shows resolved config, connection test, peer info
```

## しくみ {#architecture}

### 基本コンテキストの差し込み {#base-context-injection}

Honcho がシステムプロンプトにコンテキストを差し込むとき（`hybrid` または `context` の呼び出しモード）、基本コンテキストのかたまりは次の順で組み立てられます。

1. **セッション要約** — ここまでの会話の短いまとめ（会話の流れをすぐつかめるよう先頭に置かれます）
2. **利用者像** — Honcho が積み上げてきた利用者のモデル（好み、事実、傾向）
3. **AI peer カード** — この Hermes プロファイルの AI peer の身元カード

セッション要約は、以前のセッションがある場合、各ターンの最初に Honcho が自動で作ります。履歴を全部読み直さなくても、話の続きから始められます。

### 冷えた状態と温まった状態のプロンプトの切り替え {#cold-warm-prompt-selection}

Honcho は二つのプロンプト戦略を自動で選び分けます。

| 条件 | 戦略 | 何が起きるか |
|-----------|----------|--------------|
| 以前のセッションが無い、または利用者像が空 | **冷えた状態から** | 軽い導入用のプロンプト。要約の差し込みは省き、利用者について学ぶよう促します |
| 利用者像やセッション履歴がある | **温まった状態から** | 基本コンテキストをすべて差し込みます（要約 → 利用者像 → カード）。システムプロンプトが厚くなります |

これは設定する必要がありません。セッションの状態から自動で決まります。

### peer {#peers}

Honcho は会話を **peer** どうしのやりとりとして扱います。Hermes はセッションごとに二つの peer を作ります。

- **利用者の peer**（`peerName`）: 人間のほうです。観測したメッセージから Honcho が利用者像を組み立てます。
- **AI の peer**（`aiPeer`）: この Hermes 自身です。プロファイルごとに別の AI peer を持つので、エージェントごとに独立した見方が育ちます。

### 観測 {#observation}

peer にはそれぞれ、Honcho が何から学ぶかを決める二つのスイッチがあります。

| スイッチ | 何をするか |
|--------|-------------|
| `observeMe` | その peer 自身のメッセージを観測します（自分についての像を作ります） |
| `observeOthers` | ほかの peer のメッセージを観測します（相手についての理解を作ります） |

既定では四つとも**オン**です（双方向にすべて観測します）。

`honcho.json` で peer ごとに設定します。

```json
{
  "observation": {
    "user": { "observeMe": true, "observeOthers": true },
    "ai":   { "observeMe": true, "observeOthers": true }
  }
}
```

まとめて指定する書き方もあります。

| 設定名 | 利用者 | AI | 使いどころ |
|--------|------|----|----------|
| `"directional"`（既定） | me:on, others:on | me:on, others:on | 複数エージェント、記憶をすべて使う |
| `"unified"` | me:on, others:off | me:off, others:on | 単一エージェント、利用者だけをモデル化する |

[Honcho のダッシュボード](https://app.honcho.dev)で変えた設定は、セッションの初期化時に反映されます。サーバー側の設定が手元の既定より優先されます。

### セッション {#sessions}

Honcho のセッションは、メッセージと観測がどこに入るかの範囲を決めます。選べる方針は次のとおりです。

| 方針 | 動き |
|----------|----------|
| `per-directory`（既定） | 作業ディレクトリごとに一つのセッション |
| `per-repo` | git リポジトリのルートごとに一つのセッション |
| `per-session` | Hermes を実行するたびに新しい Honcho セッション |
| `global` | すべてのディレクトリで一つのセッション |

手動で指定するには: `hermes honcho map my-project-name`

### 呼び出しモード {#recall-modes}

エージェントが Honcho の記憶にどうアクセスするかです。

| モード | 自動で差し込む? | ツールを使える? | 使いどころ |
|------|---------------------|-----------------|----------|
| `hybrid`（既定） | はい | はい | ツールを使うか自動コンテキストで済ませるかをエージェントが判断します |
| `context` | はい | いいえ（隠されます） | トークンの消費が最小。ツール呼び出しなし |
| `tools` | いいえ | はい | 記憶へのアクセスをすべてエージェントが決めます |

## 独立した三つのつまみ {#three-orthogonal-knobs}

Honcho の dialectic の挙動は、互いに独立した三つの軸で決まります。それぞれ、ほかに影響を与えずに調整できます。

### 頻度（いつ） {#cadence-when}

dialectic とコンテキストの呼び出しが **どのくらいの間隔で** 起きるかを決めます。

| キー | 既定 | 説明 |
|-----|---------|-------------|
| `contextCadence` | `1` | コンテキスト API を呼ぶ間隔の最小ターン数 |
| `dialecticCadence` | `2` | dialectic API を呼ぶ間隔の最小ターン数。1〜5 を推奨します |
| `injectionFrequency` | `every-turn` | 基本コンテキストの差し込みを `every-turn` にするか `first-turn` にするか |

値を大きくすると dialectic の LLM が動く回数が減ります。`dialecticCadence: 2` なら一ターンおきに動き、`1` にすると毎ターン動きます。

### 深さ（何回） {#depth-how-many}

一つの問い合わせにつき、Honcho が dialectic の推論を **何回まわすか** を決めます。

| キー | 既定 | 範囲 | 説明 |
|-----|---------|-------|-------------|
| `dialecticDepth` | `1` | 1-3 | 問い合わせごとの dialectic 推論の回数 |
| `dialecticDepthLevels` | -- | array | 回ごとにレベルを上書きする任意の指定（下記参照） |

`dialecticDepth: 2` にすると、Honcho は dialectic の統合を二回まわします。一回目でひとまずの答えを出し、二回目でそれを磨きます。

`dialecticDepthLevels` を使うと、回ごとに推論のレベルを別々に指定できます。

```json
{
  "dialecticDepth": 3,
  "dialecticDepthLevels": ["low", "medium", "high"]
}
```

`dialecticDepthLevels` を省くと、`dialecticReasoningLevel`（基準になる値）から導かれる **段階的なレベル** が使われます。

| 深さ | 各回のレベル |
|-------|-------------|
| 1 | [基準] |
| 2 | [minimal, 基準] |
| 3 | [minimal, 基準, low] |

こうすることで前半の回を軽く済ませ、最後の統合に力を使えます。

**セッション開始時の深さ。** セッション開始時の下準備では、設定した `dialecticDepth` を丸ごと、ターン 1 の前に裏で走らせます。まだ何も知らない peer に対して一回だけ下準備しても中身の薄い結果になりがちですが、複数回まわせば利用者が話し始める前に点検と突き合わせのひと回りを終えられます。ターン 1 はその結果をそのまま使います。下準備が間に合わなければ、ターン 1 は時間の上限を決めたうえで同期的な呼び出しに切り替わります。

### レベル（どのくらい力を入れるか） {#level-how-hard}

dialectic の推論一回あたりの **濃さ** を決めます。

| キー | 既定 | 説明 |
|-----|---------|-------------|
| `dialecticReasoningLevel` | `low` | `minimal`, `low`, `medium`, `high`, `max` |
| `dialecticDynamic` | `true` | `true` のとき、モデルが `honcho_reasoning` に `reasoning_level` を渡して、呼び出しごとに既定を上書きできます。`false` にすると常に `dialecticReasoningLevel` が使われ、モデルからの上書きは無視されます |

レベルを上げるほど統合の内容は濃くなりますが、Honcho 側でのトークンの消費も増えます。

## 複数プロファイルの構成 {#multi-profile-setup}

Hermes のプロファイルごとに固有の Honcho AI peer を持ちつつ、ワークスペース（利用者についての情報）は共有します。つまり、

- どのプロファイルも同じ利用者像を見ます
- プロファイルごとに、自分の AI としての人物像と観測を積み上げます
- あるプロファイルが書いた結論は、共有のワークスペース経由でほかからも見えます

### Honcho peer 付きでプロファイルを作る {#create-a-profile-with-honcho-peer}

```bash
hermes profile create coder --clone
# creates host block hermes.coder, AI peer "coder", inherits config from default
```

Honcho にとって `--clone` が何をするかというと、

1. `honcho.json` に `hermes.coder` のホストブロックを作ります
2. `aiPeer: "coder"`（プロファイル名）を設定します
3. `workspace`、`peerName`、`writeFrequency`、`recallMode` などを既定から引き継ぎます
4. 最初のメッセージの前に存在するよう、Honcho 側に peer を先に作ります

### 既存のプロファイルにあとから足す {#backfill-existing-profiles}

```bash
hermes honcho sync    # creates host blocks for all profiles that don't have one yet
```

### プロファイルごとの設定 {#per-profile-config}

ホストブロックの中で、どの設定でも上書きできます。

```json
{
  "hosts": {
    "hermes.coder": {
      "aiPeer": "coder",
      "recallMode": "tools",
      "dialecticDepth": 2,
      "observation": {
        "user": { "observeMe": true, "observeOthers": false },
        "ai": { "observeMe": true, "observeOthers": true }
      }
    }
  }
}
```

## ツール {#tools}

エージェントは双方向に使える Honcho のツールを 5 つ持っています（`context` の呼び出しモードでは隠れます）。

| ツール | LLM を呼ぶ? | コスト | こんなときに |
|------|-----------|------|----------|
| `honcho_profile` | いいえ | ごくわずか | 会話の最初にさっと事実を把握したいとき、名前・役割・好みをすばやく調べたいとき |
| `honcho_search` | いいえ | 低 | 自分で考えるための材料として、過去の具体的な事実を取り出したいとき。統合されていない生の抜粋が返ります |
| `honcho_context` | いいえ | 低 | セッションのコンテキスト一式。要約、利用者像、カード、直近のメッセージ |
| `honcho_reasoning` | はい | 中〜高 | Honcho の dialectic エンジンが自然言語の問いに答えをまとめてくれます |
| `honcho_conclude` | いいえ | ごくわずか | 残しておきたい事実を書く、または消す。AI 自身についてなら `peer: "ai"` を渡します |

### `honcho_profile` {#honchoprofile}
peer のカード（名前、役割、好み、話し方といった主要な事実をまとめたもの）を読む、または更新します。更新するときは `card: [...]` を渡し、読むだけなら省きます。LLM は呼びません。

### `honcho_search` {#honchosearch}
特定の peer について蓄えたコンテキストを、意味で検索します。関連度の高い順に生の抜粋が返り、まとめは行われません。既定は 800 トークン、最大 2000 です。まとめた答えではなく、自分で考えるための具体的な事実がほしいときに向きます。

### `honcho_context` {#honchocontext}
Honcho が持つセッションのコンテキスト一式です。セッション要約、peer の利用者像、peer のカード、直近のメッセージが返ります。LLM は呼びません。今のセッションと peer について Honcho が知っていることを、まとめて見たいときに使います。

### `honcho_reasoning` {#honchoreasoning}
Honcho の dialectic 推論エンジンが自然言語の問いに答えます（Honcho 側で LLM を呼びます）。コストは高めですが、内容は濃くなります。深さは `reasoning_level` で指定します。`minimal`（速くて安い）→ `low` → `medium` → `high` → `max`（じっくり）。省略すると設定した既定（`low`）が使われます。利用者の傾向・目的・今の状態についての、まとまった理解がほしいときに使ってください。

### `honcho_conclude` {#honchoconclude}
peer について、残しておきたい結論を書く、または消します。作るときは `conclusion: "..."` を渡します。消すときは `delete_id: "..."` を渡します（個人情報を消す用です。誤った結論は Honcho が時間をかけて自分で直すので、削除が要るのは個人情報のときだけです）。この二つのうち、必ずどちらか一方だけを渡してください。

### peer を指定して双方向に使う {#bidirectional-peer-targeting}

5 つのツールはどれも、任意の `peer` パラメータを受け取ります。
- `peer: "user"`（既定）— 利用者の peer を対象にします
- `peer: "ai"` — このプロファイルの AI peer を対象にします
- `peer: "<explicit-id>"` — ワークスペース内の任意の peer ID

例:
```
honcho_profile                        # read user's card
honcho_profile peer="ai"              # read AI peer's card
honcho_reasoning query="What does this user care about most?"
honcho_reasoning query="What are my interaction patterns?" peer="ai" reasoning_level="medium"
honcho_conclude conclusion="Prefers terse answers"
honcho_conclude conclusion="I tend to over-explain code" peer="ai"
honcho_conclude delete_id="abc123"    # PII removal
```

## エージェントの使い方の型 {#agent-usage-patterns}

Honcho の記憶が有効なときの、Hermes 向けの指針です。

### 会話を始めるとき {#on-conversation-start}

```
1. honcho_profile                  → fast warmup, no LLM cost
2. If context looks thin → honcho_context  (full snapshot, still no LLM)
3. If deep synthesis needed → honcho_reasoning  (LLM call, use sparingly)
```

毎ターン `honcho_reasoning` を呼んではいけません。継続的なコンテキストの更新は自動の差し込みがすでに担っています。推論のツールは、差し込まれたコンテキストでは足りない、まとまった洞察がどうしても必要なときだけ使ってください。

### 覚えておいてほしいことを利用者が話したとき {#when-the-user-shares-something-to-remember}

```
honcho_conclude conclusion="<specific, actionable fact>"
```

よい結論の例: 「説明文よりコード例を好む」「2026 年 4 月まで Rust の非同期プロジェクトに取り組んでいる」
よくない結論の例: 「利用者が Rust について何か言った」（ぼんやりしすぎ）、「利用者は技術者らしい」（すでに利用者像に入っています）

### 過去の話を尋ねられたとき / 具体的なことを思い出す必要があるとき {#when-the-user-asks-about-past-context-you-need-to-recall-specifics}

```
honcho_search query="<topic>"       → fast, no LLM, good for specific facts
honcho_context                       → full snapshot with summary + messages
honcho_reasoning query="<question>"  → synthesized answer, use when search isn't enough
```

### `peer: "ai"` を使うとき {#when-to-use-peer-ai}

エージェント自身についての知識を積み上げたり調べたりするときに、AI peer を指定します。
- `honcho_conclude conclusion="I tend to be verbose when explaining architecture" peer="ai"` — 自分で直すため
- `honcho_reasoning query="How do I typically handle ambiguous requests?" peer="ai"` — 自分を点検するため
- `honcho_profile peer="ai"` — 自分の身元カードを見直すため

### ツールを呼ばないほうがよいとき {#when-not-to-call-tools}

`hybrid` と `context` のモードでは、基本コンテキスト（利用者像 + カード + セッション要約）が毎ターンの前に自動で差し込まれます。すでに差し込まれたものを取り直さないでください。ツールを呼ぶのは次の場合だけにします。
- 差し込まれたコンテキストに無いものが必要なとき
- 利用者から、思い出すよう、あるいは記憶を確認するよう明示的に言われたとき
- 新しいことについて結論を書くとき

### 頻度への配慮 {#cadence-awareness}

ツールとして呼ぶ `honcho_reasoning` は、自動の差し込みで動く dialectic と同じコストがかかります。ツールを明示的に呼んだあとは自動の差し込みの間隔がリセットされるので、同じターンで二重に課金されることはありません。

## 設定の一覧 {#config-reference}

設定ファイル: `$HERMES_HOME/honcho.json`（プロファイルごと）または `~/.honcho/config.json`（全体）。

### 主な設定 {#key-settings}

| キー | 既定 | 説明 |
|-----|---------|-------------|
| `apiKey` | -- | API キー（[取得はこちら](https://app.honcho.dev)） |
| `baseUrl` | -- | 自分で立てた Honcho のベース URL |
| `peerName` | -- | 利用者の peer の名前 |
| `aiPeer` | ホストのキー | AI の peer の名前 |
| `workspace` | ホストのキー | 共有するワークスペースの ID |
| `recallMode` | `hybrid` | `hybrid`, `context`, `tools` |
| `observation` | すべてオン | peer ごとの `observeMe` / `observeOthers` の真偽値 |
| `writeFrequency` | `async` | `async`, `turn`, `session`, または整数 N |
| `sessionStrategy` | `per-directory` | `per-directory`, `per-repo`, `per-session`, `global` |
| `messageMaxChars` | `25000` | メッセージ 1 通あたりの最大文字数（超えると分割されます） |

### dialectic の設定 {#dialectic-settings}

| キー | 既定 | 説明 |
|-----|---------|-------------|
| `dialecticReasoningLevel` | `low` | `minimal`, `low`, `medium`, `high`, `max` |
| `dialecticDynamic` | `true` | 問いの難しさに応じて推論を自動で引き上げます。`false` にするとレベルは固定です |
| `dialecticDepth` | `1` | 問い合わせごとの dialectic の回数（1-3） |
| `dialecticDepthLevels` | -- | 回ごとのレベルを並べた任意の配列。例: `["low", "high"]` |
| `dialecticMaxInputChars` | `10000` | dialectic への問い合わせ入力の最大文字数 |

### コンテキストの上限と差し込み {#context-budget-and-injection}

| キー | 既定 | 説明 |
|-----|---------|-------------|
| `contextTokens` | 上限なし | 差し込む基本コンテキスト全体（要約 + 利用者像 + カード）の最大トークン数。任意の上限で、省けば無制限、整数を入れると差し込む量を抑えられます。 |
| `injectionFrequency` | `every-turn` | `every-turn` または `first-turn` |
| `contextCadence` | `1` | コンテキスト API を呼ぶ間隔の最小ターン数 |
| `dialecticCadence` | `2` | dialectic の LLM を呼ぶ間隔の最小ターン数（1〜5 を推奨） |

`contextTokens` の上限は差し込むときに効きます。セッション要約 + 利用者像 + カードが上限を超えると、Honcho はまず要約を削り、次に利用者像を削って、カードは残します。長いセッションでコンテキストが膨らむのを防ぐしくみです。

### メモリコンテキストの無害化 {#memory-context-sanitization}

Honcho は、差し込む前に `memory-context` のかたまりを無害化し、プロンプトへの割り込みや壊れた内容が入らないようにします。

- 利用者が書いた結論から XML / HTML のタグを取り除きます
- 空白や制御文字を整えます
- `messageMaxChars` を超えた結論を切り詰めます
- システムプロンプトの構造を壊しかねない区切り文字をエスケープします

これにより、記号や書式を含む生の結論が、差し込まれるコンテキストのかたまりを壊してしまうという端の事例に対処しています。

## 困ったとき {#troubleshooting}

### 「Honcho not configured」と出る {#honcho-not-configured}
`hermes honcho setup` を実行してください。`~/.hermes/config.yaml` に `memory.provider: honcho` があることも確認します。

### セッションをまたぐと記憶が残らない {#memory-not-persisting-across-sessions}
`hermes honcho status` で確認してください。`saveMessages: true` になっているか、`writeFrequency` が `session`（終了時にしか書きません）になっていないかを見ます。

### プロファイルに固有の peer ができない {#profile-not-getting-its-own-peer}
作るときに `--clone` を付けてください: `hermes profile create <name> --clone`。すでにあるプロファイルには `hermes honcho sync` を使います。

### ダッシュボードで変えた観測の設定が反映されない {#observation-changes-in-dashboard-not-reflected}
観測の設定は、セッションの初期化のたびにサーバーから取り込まれます。Honcho の画面で設定を変えたら、新しいセッションを始めてください。

### メッセージが切れる {#messages-truncated}
`messageMaxChars`（既定は 25k）を超えたメッセージは、`[continued]` の印を付けて自動で分割されます。よく起きるようなら、ツールの結果や skill の内容でメッセージが膨らんでいないか確認してください。

### 差し込むコンテキストが大きすぎる {#context-injection-too-large}
コンテキストの上限を超えたという警告が出るときは、`contextTokens` を下げるか `dialecticDepth` を減らしてください。上限が厳しいときは、まずセッション要約から削られます。

### セッション要約が出てこない {#session-summary-missing}
セッション要約には、今の Honcho セッションに少なくとも一つ前のターンが必要です。冷えた状態（新しいセッションで履歴が無い）では要約は省かれ、代わりに冷えた状態から始めるプロンプトが使われます。

## CLI のコマンド {#cli-commands}

| コマンド | 説明 |
|---------|-------------|
| `hermes honcho setup` | 対話形式で設定します（クラウド / 自前、身元、観測、呼び出し、セッション） |
| `hermes honcho status` | いま有効なプロファイルの設定、接続の確認、peer の情報を表示します |
| `hermes honcho enable` | いま有効なプロファイルで Honcho を使えるようにします（必要ならホストブロックを作ります） |
| `hermes honcho disable` | いま有効なプロファイルで Honcho を止めます |
| `hermes honcho peer` | peer の名前を表示、または変更します（`--user <name>`、`--ai <name>`、`--reasoning <level>`） |
| `hermes honcho peers` | すべてのプロファイルの peer の身元を表示します |
| `hermes honcho mode` | 呼び出しモードを表示、または設定します（`hybrid`、`context`、`tools`） |
| `hermes honcho tokens` | トークンの上限を表示、または設定します（`--context <N>`、`--dialectic <N>`） |
| `hermes honcho sessions` | 分かっているディレクトリとセッション名の対応を一覧します |
| `hermes honcho map <name>` | 今の作業ディレクトリを Honcho のセッション名に対応づけます |
| `hermes honcho identity` | AI peer の身元の種を入れる、または両方の peer の利用者像を表示します |
| `hermes honcho sync` | まだホストブロックの無い Hermes のプロファイルすべてに、ホストブロックを作ります |
| `hermes honcho migrate` | OpenClaw 本体のメモリから Hermes + Honcho へ移すための手順を順に案内します |
| `hermes memory setup` | メモリの提供元を選びます（「honcho」を選ぶと同じ設定の流れになります） |
| `hermes memory status` | いま使っているメモリの提供元と設定を表示します |
| `hermes memory off` | 外部のメモリの提供元を止めます |
