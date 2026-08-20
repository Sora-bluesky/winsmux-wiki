---
title: "Honcho メモリー"
description: "Honcho による AI 前提の永続メモリー — 対話的な推論、マルチエージェントのユーザーモデリング、深い個別化"
upstream_path: user-guide/features/honcho.md
upstream_blob: 31d8391383072c9f98161fbbb1b5720b30fbb543
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/honcho
---

# Honcho メモリー {#honcho-memory}

[Honcho](https://github.com/plastic-labs/honcho) は AI 前提のメモリー基盤で、Hermes に組み込まれたメモリーの上に、対話的な推論と深いユーザーモデリングを足します。単純なキーと値の保存ではなく、会話が終わったあとにその内容を考え直すことで、ユーザーがどんな人か — 好み、話し方、目標、行動の傾向 — を捉えたモデルを保ち続けます。

:::info Honcho はメモリープロバイダーのプラグインです
Honcho は[メモリープロバイダー](/hermes/docs/user-guide/features/memory-providers/)のしくみに組み込まれています。以下の機能はすべて、共通のメモリープロバイダーの窓口から使えます。
:::

## Honcho が足すもの {#what-honcho-adds}

| できること | 組み込みメモリー | Honcho |
|-----------|----------------|--------|
| セッションをまたいで残る | ✔ ファイルベースの MEMORY.md／USER.md | ✔ API 付きのサーバー側保存 |
| ユーザーのプロフィール | ✔ エージェントが手で整える | ✔ 対話的な推論による自動化 |
| セッションの要約 | — | ✔ セッション単位での文脈の差し込み |
| 複数エージェントの分離 | — | ✔ ピアごとにプロフィールを分離 |
| 観測モード | — | ✔ unified または directional の観測 |
| 結論（導き出した気づき） | — | ✔ サーバー側で傾向を考える |
| 履歴の横断検索 | ✔ FTS5 によるセッション検索 | ✔ 結論に対する意味検索 |

**対話的な推論**: 会話のやり取りのたびに（`dialecticCadence` で間隔を決めます）、Honcho はそのやり取りを分析し、ユーザーの好み・習慣・目標についての気づきを導き出します。これが積み重なることで、エージェントはユーザーが口に出したことの先まで理解を深めていきます。この推論は複数回（1〜3 回）通すことができ、コールド用とウォーム用のプロンプトを自動で選び分けます。コールドスタートの問い合わせはユーザーの一般的な事実に、ウォームの問い合わせはセッション単位の文脈に重きを置きます。

**セッション単位の文脈**: 基本となる文脈には、ユーザー表現とピアカードに加えてセッションの要約も入るようになりました。これで、いまのセッションですでに話した内容をエージェントが把握でき、同じ話の繰り返しが減って話がつながります。

**複数エージェントのプロフィール**: 同じユーザーに複数の Hermes（たとえばコーディング用の相棒と、身の回りのことを頼む相棒）が話しかける場合、Honcho は「ピア」ごとに別々のプロフィールを保ちます。各ピアは自分の観測と結論だけを見るので、文脈が互いに混ざりません。

## セットアップ {#setup}

```bash
hermes memory setup    # select "honcho" from the provider list
```

手で設定する場合は次のとおりです。

```yaml
# ~/.hermes/config.yaml
memory:
  provider: honcho
```

```bash
echo 'HONCHO_API_KEY=***' >> ~/.hermes/.env
```

API キーは [honcho.dev](https://honcho.dev) で取得します。

## 構成 {#architecture}

### 2 層で差し込まれる文脈 {#two-layer-context-injection}

`hybrid` または `context` モードでは、Honcho は毎ターン、システムプロンプトに差し込む文脈を 2 層に組み立てます。

1. **基本となる文脈** — セッションの要約、ユーザー表現、ユーザー側のピアカード、AI 自身の表現、AI の識別カード。`contextCadence` の間隔で更新されます。「このユーザーは誰か」を受け持つ層です。
2. **対話的推論による追加分** — ユーザーのいまの状態と必要としていることについて、LLM がまとめた推論です。`dialecticCadence` の間隔で更新されます。「いま何が大事か」を受け持つ層です。

両方の層はつなげたうえで、`contextTokens` の上限（設定していれば）まで切り詰められます。

### コールドとウォームのプロンプトの選び分け {#coldwarm-prompt-selection}

対話的推論は、2 種類のプロンプトを自動で選び分けます。

- **コールドスタート**（基本となる文脈がまだない）: 一般的な問い合わせ — 「この人はどんな人か。好み、目標、仕事の進め方は何か」
- **ウォームなセッション**（基本となる文脈がある）: セッション単位の問い合わせ — 「このセッションでここまで話した内容を踏まえて、このユーザーについていま一番関係のある文脈は何か」

これは、基本となる文脈が入っているかどうかを見て自動的に決まります。

### 独立した 3 つの設定つまみ {#three-orthogonal-config-knobs}

費用と深さは、互いに独立した 3 つのつまみで決まります。

| つまみ | 決めるもの | 既定値 |
|------|----------|--------|
| `contextCadence` | `context()` の API 呼び出しの間隔（基本層の更新） | `1` |
| `dialecticCadence` | `peer.chat()` の LLM 呼び出しの間隔（対話的推論の層の更新） | `2`（1〜5 を推奨） |
| `dialecticDepth` | 1 回の対話的推論で `.chat()` を通す回数（1〜3） | `1` |

この 3 つは互いに影響しません。基本の文脈は頻繁に更新しつつ対話的推論はたまにだけ、といった組み合わせも、深い複数回の推論を低い頻度で、という組み合わせもできます。たとえば `contextCadence: 1, dialecticCadence: 5, dialecticDepth: 2` なら、基本の文脈は毎ターン更新し、対話的推論は 5 ターンごとに動き、そのたびに 2 回通します。

### 対話的推論の深さ（複数回） {#dialectic-depth-multi-pass}

`dialecticDepth` が 1 より大きいと、対話的推論のたびに `.chat()` を複数回通します。

- **0 回目**: コールドまたはウォームのプロンプト（前述のとおり）
- **1 回目**: 自己点検 — 最初の見立ての足りないところを見つけ、直近のセッションから根拠を集めます
- **2 回目**: 突き合わせ — それまでの結果に食い違いがないか調べ、最終的なまとめを出します

各回は比率に応じた推論レベルを使います（前半は軽く、本番の回は基準どおり）。回ごとのレベルは `dialecticDepthLevels` で上書きできます。3 回通すなら `["minimal", "medium", "high"]` のように書きます。

前の回が強い手応えのある結果（長くて構造のある出力）を返していれば、そこで打ち切られます。深さ 3 が必ず LLM 呼び出し 3 回になるわけではありません。

### セッション開始時の先読み {#session-start-prewarm}

セッションの初期化時に、Honcho は設定された `dialecticDepth` のままバックグラウンドで対話的推論を走らせ、その結果を 1 ターン目の文脈の組み立てにそのまま渡します。まだ何も知らないピアに対して 1 回だけ通しても中身の薄い結果になりがちなので、ユーザーが話し出す前に点検と突き合わせまで回しておくわけです。1 ターン目までに先読みが間に合わなければ、1 ターン目は時間制限つきの同期呼び出しに切り替わります。

### 問い合わせに応じた推論レベル {#query-adaptive-reasoning-level}

自動で差し込まれる対話的推論は、問い合わせの長さに応じて `dialecticReasoningLevel` を上げます。120 文字以上で 1 段階、400 文字以上で 2 段階上がり、`reasoningLevelCap`（既定は `"high"`）が上限です。`reasoningHeuristic: false` にすると、自動の呼び出しはすべて `dialecticReasoningLevel` に固定されます。使えるレベルは `minimal`、`low`、`medium`、`high`、`max` です。

## 設定できる項目 {#configuration-options}

Honcho の設定は `~/.honcho/config.json`（全体）または `$HERMES_HOME/honcho.json`（プロファイル単位）に書きます。セットアップウィザードがこれを代わりにやってくれます。

### 認証つきの自前 Honcho サーバー {#self-hosted-honcho-with-authentication}

自前で立てた Honcho サーバーに Hermes を向けるとき、`hermes honcho setup`（および `hermes memory setup`）はベース URL のあとに **ローカルの JWT／ベアラートークン**を尋ねます。サーバーの `AUTH_JWT_SECRET`（Honcho の compose の環境変数）で署名した JWT を貼れば、認証つきでアクセスできます。`AUTH_USE_AUTH=false` で動かしているサーバーなら空のままで構いません。このローカルのトークンはホストブロックの下（`honcho.json` の `hosts.<host>.apiKey`）に、クラウド用の `apiKey` とは別に保存されるので、あとで `Cloud or local?` の質問を `cloud` に戻しても、どちらの認証情報も失われません。

### 設定の全一覧 {#full-config-reference}

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `contextTokens` | `null` (uncapped) | 1 ターンあたりに自動で差し込む文脈のトークン上限。整数（例: 1200）を入れると上限になります。単語の切れ目で切り詰めます |
| `contextCadence` | `1` | `context()` の API 呼び出しの最小間隔（基本層の更新） |
| `dialecticCadence` | `2` | `peer.chat()` の LLM 呼び出しの最小間隔（対話的推論の層）。1〜5 を推奨。`tools` モードでは関係ありません — モデルが自分で呼び出します |
| `dialecticDepth` | `1` | 1 回の対話的推論で `.chat()` を通す回数。1〜3 に丸められます |
| `dialecticDepthLevels` | `null` | 各回の推論レベルを並べた配列（任意）。例: `["minimal", "low", "medium"]`。比率で決まる既定値を上書きします |
| `dialecticReasoningLevel` | `'low'` | 基準となる推論レベル: `minimal`、`low`、`medium`、`high`、`max` |
| `dialecticDynamic` | `true` | `true` なら、モデルがツールの引数で呼び出しごとに推論レベルを上書きできます |
| `dialecticMaxChars` | `600` | システムプロンプトに差し込む対話的推論の結果の最大文字数 |
| `recallMode` | `'hybrid'` | `hybrid`（自動の差し込み + ツール）、`context`（差し込みのみ）、`tools`（ツールのみ） |
| `writeFrequency` | `'async'` | メッセージを書き出すタイミング: `async`（バックグラウンドのスレッド）、`turn`（同期）、`session`（終了時にまとめて）、または整数 N |
| `saveMessages` | `true` | メッセージを Honcho API に保存するかどうか |
| `observationMode` | `'directional'` | `directional`（すべて有効）または `unified`（共有プール）。細かく決めたいときは `observation` オブジェクトで上書きします |
| `messageMaxChars` | `25000` | `add_messages()` で送る 1 メッセージあたりの最大文字数。超えると分割されます |
| `dialecticMaxInputChars` | `10000` | `peer.chat()` に渡す対話的推論の入力の最大文字数 |
| `sessionStrategy` | `'per-directory'` | `per-directory`、`per-repo`、`per-session`、`global` |
| `pinUserPeer` | `false` | ゲートウェイ専用。`true` にすると、プラットフォームの利用者はすべて `peerName` にまとめられます |
| `userPeerAliases` | `{}` | ゲートウェイ専用。実行時 ID とピアの対応表（`{"7654321": "alice"}`）。複数を 1 つにまとめられます |
| `runtimePeerPrefix` | `""` | ゲートウェイ専用。別名に当てはまらない実行時 ID に名前空間を付けます（`telegram_7654321`） |

**セッションの持ち方**は、Honcho のセッションを自分の作業にどう対応させるかを決めます。
- `per-session` — `hermes` を実行するたびに新しいセッションになります。まっさらな状態から始まり、記憶はツールで取り出します。使い始めたばかりの人におすすめです。
- `per-directory` — 作業ディレクトリごとに Honcho のセッションを 1 つ持ちます。実行をまたいで文脈が積み上がります。
- `per-repo` — git リポジトリごとにセッションを 1 つ持ちます。
- `global` — すべてのディレクトリで 1 つのセッションを使います。

**想起モード**は、記憶が会話にどう流れ込むかを決めます。
- `hybrid` — 文脈がシステムプロンプトに自動で差し込まれ、かつツールも使えます（いつ問い合わせるかはモデルが決めます）。
- `context` — 自動の差し込みだけで、ツールは出しません。
- `tools` — ツールだけで、自動の差し込みはありません。エージェントが `honcho_reasoning` や `honcho_search` などを自分で呼ぶ必要があります。

**想起モードごとの設定の効き方:**

| 設定 | `hybrid` | `context` | `tools` |
|---------|----------|-----------|---------|
| `writeFrequency` | メッセージを書き出す | メッセージを書き出す | メッセージを書き出す |
| `contextCadence` | 基本の文脈の更新を抑える | 基本の文脈の更新を抑える | 関係なし — 差し込みがありません |
| `dialecticCadence` | 自動の LLM 呼び出しを抑える | 自動の LLM 呼び出しを抑える | 関係なし — モデルが自分で呼び出します |
| `dialecticDepth` | 1 回ごとに複数回通す | 1 回ごとに複数回通す | 関係なし — モデルが自分で呼び出します |
| `contextTokens` | 差し込みの量を抑える | 差し込みの量を抑える | 関係なし — 差し込みがありません |
| `dialecticDynamic` | モデルによる上書きを決める | 該当なし（ツールがありません） | モデルによる上書きを決める |

`tools` モードでは、主導権は完全にモデルにあります。使いたいときに `honcho_reasoning` を、自分で選んだ `reasoning_level` で呼び出します。間隔や上限の設定が効くのは、自動の差し込みがあるモード（`hybrid` と `context`）だけです。

## ゲートウェイでの識別子の対応づけ {#gateway-identity-mapping}

ここでの設定が意味を持つのは、[Hermes のゲートウェイ](/hermes/docs/developer-guide/gateway-internals/)を動かしているときだけです。ゲートウェイは、利用者がプラットフォーム固有の実行時 ID（Telegram の UID、Discord の snowflake、Slack のユーザー）を持ってやって来る唯一の入口です。CLI、TUI、デスクトップのセッションには実行時 ID がなく、常に `peerName` に行き着くので、ゲートウェイを使っていなければこれらのキーは何もしません。

セットアップウィザードはゲートウェイのプラットフォームがつながっているかを調べ、なければこの手順ごと飛ばします。動くときは 1 つだけ質問し — *このゲートウェイには誰が話しかけますか* — その答えからキーを決めます。

| 答え | 結果 |
|--------|--------|
| **自分だけ** | `pinUserPeer: true` — エージェント以外のゲートウェイ利用者はすべて自分のピアにまとめられます。この固定はすべての別名より優先されるので、ユーザー側に独自のピアが要らないときだけ選んでください。それぞれ別のピアが必要なエージェントがゲートウェイに来る場合は、固定**せず**に `pinUserPeer: false` のままにして、`userPeerAliases`（`[e]` の編集画面）で対応づけてください |
| **自分と他の人**（まとめる） | `pinUserPeer: false` と、自分の実行時 ID を `peerName` に対応づける `userPeerAliases`。自分はこれまでの履歴を引き継ぎ、他の人はそれぞれ自分のピアを持ちます |
| **他の人だけ** | `pinUserPeer: false`、必要なら `runtimePeerPrefix`。利用者ごとに自分のピアを持ちます |

質問のところで `[e]` を選ぶと、3 つのキーを直接設定できます。

解決の処理はキーを上から順に試し、最初に当たったものを使います。`pinUserPeer` → `userPeerAliases[id]` → `runtimePeerPrefix + id` → 生の実行時 ID → `peerName` → セッションキーでの代替、の順です。

:::warning 固定を外すとまとめた記憶が取り残されます
`pinUserPeer` を `true` から `false` に変えても、データは移りません。`peerName` の下に積み上がった記憶はそこに残ったままで、プラットフォームの利用者は新しい空のピアに行き着きます。自分のぶんの連続性を保つには、自分の実行時 ID が `peerName` に対応づく**まとめる**やり方を選んでください。この切り替えを見つけると、ウィザードが自動でそちらを勧めます。
:::

:::note 非推奨のキー
`pinPeerName` は `pinUserPeer` の古い別名です。互換のために今も読み込まれます（両方あれば `pinUserPeer` が勝ちます）が、書き込まれることはありません。セットアップをやり直すと、正式なキーのほうへ移されます。
:::

## 観測（directional と unified） {#observation-directional-vs-unified}

Honcho は会話を、ピア同士がメッセージをやり取りするものとして扱います。各ピアには 2 つの観測の切り替えがあり、これは Honcho の `SessionPeerConfig` と 1 対 1 で対応します。

| 切り替え | 効果 |
|--------|--------|
| `observeMe` | Honcho がこのピア自身のメッセージからこのピアの表現を作ります |
| `observeOthers` | このピアが相手のピアのメッセージを観測します（ピアをまたいだ推論の材料になります） |

ピア 2 つ × 切り替え 2 つで、フラグは 4 つになります。`observationMode` はその組み合わせに名前を付けたものです。

| 組み合わせ | ユーザー側のフラグ | AI 側のフラグ | 意味 |
|--------|-----------|----------|-----------|
| `"directional"`（既定） | me: 有効, others: 有効 | me: 有効, others: 有効 | 互いを完全に観測します。ピアをまたいだ対話的推論、つまり「ユーザーが言ったことと AI が返したことをもとに、AI がユーザーについて何を知っているか」ができるようになります。 |
| `"unified"` | me: 有効, others: 無効 | me: 無効, others: 有効 | 共有プールとしての振る舞い。AI はユーザーのメッセージだけを観測し、ユーザー側のピアは自分だけをモデル化します。観測者を 1 つにまとめたプールです。 |

ピアごとに細かく決めたいときは、明示的な `observation` ブロックで組み合わせを上書きします。

```json
"observation": {
  "user": { "observeMe": true,  "observeOthers": true },
  "ai":   { "observeMe": true,  "observeOthers": false }
}
```

よくある使い方は次のとおりです。

| やりたいこと | 設定 |
|--------|--------|
| すべてを観測する（ほとんどの人） | `"observationMode": "directional"` |
| AI が自分の返答からユーザーを作り直さないようにする | `"ai": {"observeMe": true, "observeOthers": false}` |
| AI 側のピアの強い人格を、自己観測で書き換えさせない | `"ai": {"observeMe": false, "observeOthers": true}` |

[Honcho のダッシュボード](https://app.honcho.dev)で設定したサーバー側の切り替えは、手元の既定値より優先されます。Hermes がセッションの開始時にそれを取り込みます。

## ツール {#tools}

Honcho をメモリープロバイダーとして有効にすると、5 つのツールが使えるようになります。

| ツール | 役割 |
|------|---------|
| `honcho_profile` | ピアカードの読み取りまたは更新 — 更新するときは `card`（事実の一覧）を渡し、読むだけなら省きます |
| `honcho_search` | 文脈に対する意味検索 — LLM でまとめず、元の記述をそのまま返します |
| `honcho_context` | セッションの文脈すべて — 要約、ユーザー表現、カード、直近のメッセージ |
| `honcho_reasoning` | Honcho の LLM がまとめた答え — `reasoning_level`（minimal/low/medium/high/max）を渡して深さを決めます |
| `honcho_conclude` | 結論の作成または削除 — 作るときは `conclusion`、消すときは `delete_id` を渡します（消せるのは個人情報のみ） |

## CLI コマンド {#cli-commands}

`hermes honcho` のサブコマンドは、**Honcho が有効なメモリープロバイダーになっているときにだけ登録されます**（`config.yaml` の `memory.provider: honcho`）。入れたばかりのときは `hermes memory setup honcho` で Honcho を直接設定してください（`hermes memory setup` を実行して一覧から選んでも構いません）。そのあと次に実行したときから `hermes honcho` のサブコマンドが現れます。

```bash
hermes memory setup honcho    # Configure Honcho directly (works before activation)
hermes honcho status          # Connection status, config, and key settings
hermes honcho setup           # Redirects to `hermes memory setup` (post-activation alias)
hermes honcho strategy        # Show or set session strategy (per-session/per-directory/per-repo/global)
hermes honcho peer            # Show or update peer names + dialectic reasoning level
hermes honcho mode            # Show or set recall mode (hybrid/context/tools)
hermes honcho tokens          # Show or set token budget for context and dialectic
hermes honcho identity        # Seed or show the AI peer's Honcho identity
hermes honcho sync            # Sync Honcho config to all existing profiles
hermes honcho peers           # Show peer identities across all profiles
hermes honcho sessions        # List known Honcho session mappings
hermes honcho map             # Map current directory to a Honcho session name
hermes honcho enable          # Enable Honcho for the active profile
hermes honcho disable         # Disable Honcho for the active profile
hermes honcho migrate         # Step-by-step migration guide from openclaw-honcho
```

## `hermes honcho` からの移行 {#migrating-from-hermes-honcho}

以前、単独の `hermes honcho setup` を使っていた場合は次のようになります。

1. これまでの設定（`honcho.json` または `~/.honcho/config.json`）はそのまま残ります
2. サーバー側のデータ（記憶、結論、ユーザーのプロフィール）もそのまま残ります
3. config.yaml に `memory.provider: honcho` を設定すれば、また動き出します

ログインし直したり設定をやり直したりする必要はありません。`hermes memory setup` を実行して「honcho」を選べば、ウィザードが今ある設定を見つけます。

## 詳しい説明 {#full-documentation}

すべての項目は[メモリープロバイダー — Honcho](/hermes/docs/user-guide/features/memory-providers/#honcho) にあります。
