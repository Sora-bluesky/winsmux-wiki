---
title: "ずっと残る記憶"
description: "Hermes Agent がセッションをまたいで覚えておく仕組み — MEMORY.md、USER.md、そしてセッション検索"
upstream_path: user-guide/features/memory.md
upstream_blob: 11a1f2376f96e6c43fca4ec0190e80e92001add0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
---

# ずっと残る記憶 {#persistent-memory}

Hermes Agent は、量に上限のある、手入れされた記憶をセッションをまたいで持ち続けます。おかげで、あなたの好み、あなたのプロジェクト、あなたの環境、そして自分で学んだことを覚えていられます。

## どう動くか {#how-it-works}

エージェントの記憶は、二つのファイルでできています。

| ファイル | 役割 | 文字数の上限 |
|------|---------|------------|
| **MEMORY.md** | エージェント自身のメモ — 環境の事実、決まりごと、学んだこと | 2,200 文字（およそ 800 トークン） |
| **USER.md** | 利用者の人物像 — 好み、話し方の好み、期待していること | 1,375 文字（およそ 500 トークン） |

どちらも `~/.hermes/memories/` に置かれ、セッションの開始時にその時点の姿のままシステムプロンプトへ差し込まれます。エージェントは `memory` ツールで自分の記憶を管理し、項目を足したり、置き換えたり、消したりできます。

:::caution Hermes のホーム 1 つにつきエージェントは 1 つ
2 つのエージェントのプロセスを、同じ Hermes のホームディレクトリに向けてはいけません。記憶の書き込みは自動で行われ、セッションの開始時にシステムプロンプトへ読み込まれます。1 つのホームに書き手が 2 人いると、お互いの項目が積み重なって、どちらのエージェントも（そしてあなたも）書いた覚えのない状態ができあがります。記憶は[プロファイル](/hermes/docs/user-guide/profiles/)ごとに分かれる作りになっています。2 つ目のエージェントには自分のプロファイルを持たせてください。記憶を共有したいなら、代わりに[外部のメモリープロバイダー](/hermes/docs/user-guide/features/memory-providers/)を使ってください。
:::

:::info
文字数の上限は、記憶を絞ったままにするためのものです。記憶は自動では詰め直され**ません**。
上限を超える書き込みが起きそうなときは、`memory` ツールは黙って項目を捨てたりせず、
エラーを返します。そこでエージェント自身が場所を空けます。同じやりとりの中で項目を
まとめたり消したりしてから、もう一度書き込みます（[記憶がいっぱいになったら](#what-happens-when-memory-is-full)
をご覧ください）。`replace` も上限に縛られることに注意してください。ある項目を
もっと長いものに差し替えれば、やはりあふれます。新しい中身を短くするか、
別の項目を消して場所を作る必要があります。
:::

## 記憶はシステムプロンプトにどう現れるか {#how-memory-appears-in-the-system-prompt}

セッションが始まるたびに、記憶の項目はディスクから読み込まれ、その時点の姿のままシステムプロンプトへ次のように書き出されます。

```
══════════════════════════════════════════════
MEMORY (your personal notes) [67% — 1,474/2,200 chars]
══════════════════════════════════════════════
User's project is a Rust web service at ~/code/myapi using Axum + SQLx
§
This machine runs Ubuntu 22.04, has Docker and Podman installed
§
User prefers concise responses, dislikes verbose explanations
```

この書き方には次のものが含まれます。

- どちらの保管場所か（MEMORY か USER PROFILE か）を示す見出し
- 残りの余裕がわかるように、使用率と文字数
- `§`（セクション記号）で区切られた一つひとつの項目
- 項目は複数行にわたっても構いません

**その時点の姿で固まる作り:** システムプロンプトへの差し込みは、セッションの開始時に一度だけ写し取られ、途中で変わることはありません。これはわざとそうしています。LLM の前置きのキャッシュが効いたままになり、速く動くからです。セッションの途中でエージェントが記憶の項目を足したり消したりすると、その変更はすぐディスクに書かれますが、システムプロンプトに現れるのは次のセッションからです。ツールの返事はいつでも今の状態を見せます。

## memory ツールでできること {#memory-tool-actions}

エージェントは `memory` ツールを、次の三つの使い方で呼びます。

- **add** — 新しい記憶の項目を足す
- **replace** — ある項目を新しい中身に差し替える（`old_text` による部分一致で探します）
- **remove** — もう関係のなくなった項目を消す（`old_text` による部分一致で探します）

`read` という使い方はありません。記憶の中身はセッションの開始時に自動でシステムプロンプトへ差し込まれるからです。エージェントは自分の記憶を、会話の文脈の一部として見ています。

### 部分一致で探す {#substring-matching}

`replace` と `remove` は、短くて他と重ならない部分一致で項目を探します。項目の全文を書く必要はありません。`old_text` は、ちょうど一つの項目を言い当てられる文字列であれば十分です。

```python
# If memory contains "User prefers dark mode in all editors"
memory(action="replace", target="memory",
       old_text="dark mode",
       content="User prefers light mode in VS Code, dark mode in terminal")
```

その文字列が複数の項目に当たってしまうと、もっと絞り込んでほしいというエラーが返ります。

## 二つの保管場所 {#two-targets-explained}

### `memory` — エージェント自身のメモ {#memory-agents-personal-notes}

環境、仕事の進め方、学んだ教訓など、エージェントが覚えておく必要のあることを入れます。

- 環境の事実（OS、道具、プロジェクトの構成）
- プロジェクトの決まりごとと設定
- 道具の癖と、その回避のしかた
- 済んだ仕事の覚え書き
- うまくいったやり方や技

### `user` — 利用者の人物像 {#user-user-profile}

利用者そのもの、好み、話し方の好みについての情報を入れます。

- 名前、役割、時間帯
- 話し方の好み（簡潔か詳しいか、形式の好み）
- 嫌なこと、避けてほしいこと
- 仕事の進め方の癖
- 技術の習熟度

## 何を残し、何を残さないか {#what-to-save-vs-skip}

### 進んで残すもの {#save-these-proactively}

エージェントは自分で残していきます。頼む必要はありません。次のようなことを学んだときに残します。

- **利用者の好み:** 「JavaScript より TypeScript がいい」→ `user` へ
- **環境の事実:** 「このサーバーは Debian 12 で PostgreSQL 16 が動いている」→ `memory` へ
- **訂正:** 「Docker のコマンドに `sudo` は要らない。docker グループに入っている」→ `memory` へ
- **決まりごと:** 「このプロジェクトはタブ、1 行 120 文字、Google 形式の docstring」→ `memory` へ
- **済んだ仕事:** 「2026-01-15 にデータベースを MySQL から PostgreSQL へ移した」→ `memory` へ
- **はっきりした依頼:** 「API キーの入れ替えは毎月だと覚えておいて」→ `memory` へ

### 残さないもの {#skip-these}

- **当たり前で細かすぎること:** 「Python について聞かれた」— 漠然としすぎて役に立ちません
- **すぐ調べ直せること:** 「Python 3.12 は f-string の入れ子に対応している」— ウェブで調べられます
- **生のデータの塊:** 大きなコード、ログ、表 — 記憶に入れるには大きすぎます
- **そのときかぎりのもの:** 一時的なファイルの場所、一度きりのデバッグの文脈
- **すでに文脈ファイルにあること:** SOUL.md や AGENTS.md の中身

## 容量のやりくり {#capacity-management}

システムプロンプトが膨らまないように、記憶には厳しい文字数の上限があります。

| 保管場所 | 上限 | だいたいの項目数 |
|-------|-------|----------------|
| memory | 2,200 文字 | 8〜15 件 |
| user | 1,375 文字 | 5〜10 件 |

### 記憶がいっぱいになったら {#what-happens-when-memory-is-full}

上限を超えてしまう項目を足そうとすると、ツールはエラーを返します。

```json
{
  "success": false,
  "error": "Memory at 2,100/2,200 chars. Adding this entry (250 chars) would exceed the limit. Consolidate now: use 'replace' to merge overlapping entries into shorter ones or 'remove' stale or less important entries (see current_entries below), then retry this add — all in this turn.",
  "current_entries": ["..."],
  "usage": "2,100/2,200"
}
```

そうしたらエージェントは次のようにします。

1. 今ある項目を読む（エラーの返事に並んでいます）
2. 消せるもの、まとめられるものを見つける
3. `replace` で近い項目どうしを短くまとめる
4. そのうえで新しい項目を `add` する

**うまくやるこつ:** 記憶が容量の 8 割を超えたら（システムプロンプトの見出しで見えます）、新しい項目を足す前にまとめておきましょう。たとえば「このプロジェクトは X を使う」という三つの項目を、プロジェクト全体を説明する一つの項目にまとめます。

### よい記憶の項目の実例 {#practical-examples-of-good-memory-entries}

**短く、中身の詰まった項目がいちばんうまく働きます。**

```
# Good: Packs multiple related facts
User runs macOS 14 Sonoma, uses Homebrew, has Docker Desktop and Podman. Shell: zsh with oh-my-zsh. Editor: VS Code with Vim keybindings.

# Good: Specific, actionable convention
Project ~/code/api uses Go 1.22, sqlc for DB queries, chi router. Run tests with 'make test'. CI via GitHub Actions.

# Good: Lesson learned with context
The staging server (10.0.1.50) needs SSH port 2222, not 22. Key is at ~/.ssh/staging_ed25519.

# Bad: Too vague
User has a project.

# Bad: Too verbose
On January 5th, 2026, the user asked me to look at their project which is
located at ~/code/api. I discovered it uses Go version 1.22 and...
```

## 同じものを二度入れない {#duplicate-prevention}

記憶の仕組みは、まったく同じ項目を自動ではねつけます。すでにある中身を足そうとすると、「同じものは足しませんでした」という知らせとともに成功が返ります。

## 危ないものが混じっていないかの確認 {#security-scanning}

記憶の項目はシステムプロンプトへ差し込まれるものなので、受け入れる前に、乗っ取りや持ち出しの手口が混じっていないか調べます。脅威の型（プロンプトの乗っ取り、認証情報の持ち出し、SSH の裏口）に当たる中身や、目に見えない Unicode の文字を含むものは弾かれます。

## セッション検索 {#session-search}

MEMORY.md と USER.md のほかに、エージェントは `session_search` ツールで過去の会話を探せます。

- CLI とメッセージングのセッションはすべて SQLite（`~/.hermes/state.db`）に保存され、FTS5 の全文検索が使えます
- 検索は、データベースにある実際のメッセージをそのまま返します。LLM による要約もなく、途中で切られることもありません
- 今の記憶に入っていなくても、何週間も前に話したことを見つけられます
- 見つけたセッションの中を、前へ後ろへたどることもできます

```bash
hermes sessions list    # Browse past sessions
```

三つの呼び出し方（探す／たどる／眺める）と返事の形については、[セッション検索ツール](/hermes/docs/user-guide/sessions/#session-search-tool)をご覧ください。

### session_search と記憶の使い分け {#sessionsearch-vs-memory}

| 観点 | ずっと残る記憶 | セッション検索 |
|---------|------------------|----------------|
| **容量** | 全部でおよそ 1,300 トークン | 上限なし（すべてのセッション） |
| **速さ** | 一瞬（システムプロンプトの中） | FTS5 の検索でおよそ 20ms、たどるのは 1ms ほど |
| **費用** | どのプロンプトでもトークンを使う | 無料 — LLM を呼びません |
| **使いどころ** | いつでも手元にあってほしい大事な事実 | 過去の特定の会話を探すとき |
| **手入れ** | エージェントが自分で選んで整える | 自動 — すべてのセッションが保存される |
| **トークンの費用** | セッションごとに固定（およそ 1,300 トークン） | 必要になったときだけ（検索したとき） |

**記憶**は、いつでも文脈にあってほしい大事な事実のためのものです。**セッション検索**は、「先週これについて話したっけ？」というふうに、過去の会話から細かいところを思い出す必要があるときのためのものです。

## 学びのあゆみ（`/journey`） {#learning-journey-journey}

学びのあゆみは、Hermes が学んできたすべて（保存されたスキルと記憶の項目）を時間順に並べた眺めです（上が古く、下が新しい）。積み上がっていく様子を再生できる「星座」のつまみも付いています。同じグラフのデータが、三つの見せ方を支えています。

- **昔ながらの CLI / 単体で** — `hermes journey`（別名: `hermes learning`、`hermes memory-graph`）が、時間順の眺めを端末に描きます。フラグは、`--play` で積み上がりを動かし（`--fps` で速さを調整）、`--width`/`--height` で描く大きさを指定し、`--no-color` で色を消し、`--json` で生のグラフのデータをそのまま出します。
- **TUI** — `/journey`（別名: `/learning`、`/memory-graph`）で、時間順の眺めを重ねて開きます。
- **デスクトップアプリ** — `/journey` で Star Map（記憶のグラフ）の画面が開きます。同じ点を触って動かせる眺めです。

眺めるだけでなく、Hermes が学んだことを**間引いたり直したり**するのも、このあゆみの場です。

| コマンド | すること |
|---------|--------------|
| `hermes journey list` | 点の id を並べます。スキルは名前、記憶のかたまりは `memory:<source>:<index>` の形の id です。 |
| `hermes journey delete <node> [-y]` | 点を消します。スキルは**書庫へ**入り（戻せます）、記憶のかたまりは取り除かれます。`-y` で確認を飛ばします。 |
| `hermes journey edit <node>` | その点の中身（スキルなら `SKILL.md`、記憶ならそのかたまり）を `$EDITOR` で開きます。 |

同じ `list` / `delete <id>` / `edit <id>` は、CLI の会話の中で使う `/journey` からも呼べますし、デスクトップの画面では点をそのまま編集・削除できます。

## 設定 {#configuration}

```yaml
# In ~/.hermes/config.yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # ~800 tokens
  user_char_limit: 1375     # ~500 tokens
  write_approval: false     # false = write freely (default) | true = require approval
```

`memory_enabled` と `user_profile_enabled` の**両方**を `false` にすると、
組み込みの保管場所は完全に止まります。`memory` ツールは一覧から外れ、
その使い方の説明もシステムプロンプトから消えるので、モデルは使えない道具の
ことを知らされません。`memory.provider` で設定した外部のプロバイダー
（Hindsight、Mem0、Honcho など）はこの影響を受けず、自分の道具を持ち続けます。
組み込みのファイルの*代わりに*よその記憶の仕組みを使いたいときは、この形に
してください。`agent.disabled_toolsets` に `memory` を挙げるほうはもっと重い
スイッチで、外部プロバイダーの道具まで隠します。

`memory_enabled: false` だけにした場合（人物像は生かしたまま）、ツールは
残ります。人物像の保管場所を支えているからです。ただしシステムプロンプトでは、
記憶についての説明が人物像だけの短いものに差し替わるので、モデルは利用者の
人物像に関する事実だけを残すよう促され、止めてあるメモの側へ導かれることは
ありません。

## 記憶の書き込みを止めるかどうか（`write_approval`） {#controlling-memory-writes-writeapproval}

初期状態では、エージェントは自由に記憶を残します。やりとりのあとに走る、裏の
自己改善の見直しからの書き込みも含めてです。先に自分で確かめたいなら、
`memory.write_approval: true` にしてください。**表のやりとりにも裏の見直しにも**
同じように効く、単純な入り切りの関門です。

| `write_approval` | 動き |
|------------------|-----------|
| `false`（初期値） | 自由に書き込みます — 関門は切ってあります（この仕組みが入る前と同じ動きです）。 |
| `true` | 何かを残す前に承認が要ります。会話しながら使う CLI では、表の書き込みはその場で聞かれます（項目は全部読める短さです）。それ以外の場所 — メッセージングのプラットフォーム、スクリプト、そして裏の自己改善の見直し — では、書き込みは**取り置かれ**、`/memory pending` で確かめられます。 |

> 記憶をまるごと止めたいとき（関門を掛けるだけでなく）は、`memory_enabled: false` と `user_profile_enabled: false` の両方にしてください。組み込みの保管場所が両方とも止まっていると、組み込みの `memory` ツールは自動的に隠されます。

取り置かれた書き込みは、CLI からでもどのメッセージングのプラットフォームからでも確かめられます。

```
/memory pending             # list staged memory writes (auto ones tagged [auto])
/memory approve <id>        # apply one (or 'all')
/memory reject <id>         # drop one (or 'all')
/memory approval on         # turn the gate on (or 'off') and persist it
```

「エージェントが私について間違った思い込みを残してしまった」への答えがこれです。
`write_approval: true` にしておけば、どの書き込みも — とくに頼んでいない裏からの
ものも — あなたの「はい」か「いいえ」を待ってからでないと、人物像には入りません。

## 裏の見直しの知らせ（`display.memory_notifications`） {#background-review-notifications-displaymemorynotifications}

やりとりのあと、裏の自己改善の見直しが、そっと記憶を残したりスキルを直したり
することがあります。これは Hermes の、同意を大事にする学びのループです。
繰り返された訂正や、長く役に立つ仕事の教訓は、短い記憶の項目や手順のスキルに
なっていきます。`write_approval` を使えば、それらの書き込みを、これからの
セッションに効いてくる前に取り置いて確かめられます。初期状態では、起きたことが
わかるように `💾 Memory updated` という短い行が会話に出ます。どれくらい
おしゃべりにするかは、次で決められます。

```yaml
display:
  memory_notifications: on    # off | on (default) | verbose
```

| 値 | 動き |
|-------|-----------|
| `off` | 会話には何も出しません。見直しは変わらず走り、書き込みも行われます。ただ、その行が見えないだけです。 |
| `on`（初期値） | ひとことの行を出します。たとえば `💾 Memory updated`、`💾 Skill 'foo' patched` です。 |
| `verbose` | 何が変わったかの短い抜粋も付けます。たとえば `💾 Memory ➕ User prefers terse replies` や、スキルの `"old" → "new"` という差分の断片です。 |

> これが決めるのは、**ゲートウェイ**の会話に出す知らせだけです。見直しそのものや、
> 記憶・スキルの保管場所への書き込みは、この設定の影響を受けません。
> プラットフォームごとに決めたいときは `display.platforms.<platform>.memory_notifications` を使ってください。

## 見直しを安いモデルで走らせる（`auxiliary.background_review`） {#running-the-review-on-a-cheaper-model-auxiliarybackgroundreview}

見直しは初期状態では**メインのチャットモデル**で走り、会話をなぞり直します。
その会話はすでにプロンプトのキャッシュで温まっているので、読み出しは安く
済みます。メインが高いモデルのときは、見直しだけを安いモデルで走らせることも
できます。

```yaml
auxiliary:
  background_review:
    provider: openrouter
    model: google/gemini-3-flash-preview   # auto (default) = main chat model
```

メインとは**別の**モデルを指すと、見直しはそちらで、かなり安く走ります
（試した範囲でおよそ 3〜5 倍の差でした）。別のモデルではどのみちメインの
プロンプトのキャッシュを使い回せないので、分身は会話をまるごとではなく、
短くまとめた**要約**（直近のやりとりはそのまま、古いものは要約）をなぞり直します。
新しいキャッシュへ書き込む量を最小限にするためです。拾えるものは変わりません。
試したかぎり、記憶の取り込みはまったく同じで、スキルの取り込みもメインモデルでの
見直しとほぼ同じでした。

`auto` のまま（あるいはメインと同じモデルを指定）にしておけば何も変わりません。
見直しは、温まったキャッシュをまるごとなぞり直しながらメインのモデルで走り続けます。

### 自動の見直しを止める（`enabled`） {#disabling-automatic-reviews-enabled}

忙しいホストでは、見直しの分身が全体のトークンのかなりの割合を食うことが
あります。うながしの間隔をゼロにしなくても、運用する側で止められます。

```yaml
auxiliary:
  background_review:
    enabled: true              # false = skip automatic post-turn forks
```

`enabled: false` にすると、やりとりのあとの分身は自動では立ち上がりません。
手で呼ぶ `/refine` はそのまま使えます。

分身の使用量は `session_model_usage` に `task='background_review'` として
残り、終わったことを知らせる行が `agent.log` に書かれます
（`Background review complete: thread=bg-review calls=… in=… out=… result=…`）。

## スキルの書き込みを止めるかどうか（`skills.write_approval`） {#controlling-skill-writes-skillswriteapproval}

スキルにも同じ入り切りの関門がありますが、確かめ方の見た目は違います。
`SKILL.md` は、会話の吹き出しで読むにはあまりに大きいからです。

```yaml
skills:
  write_approval: false     # false = write freely (default) | true = require approval
```

`write_approval: true` のとき、スキルへの書き込み（create / edit / patch / write_file /
delete）は、どこから来たものでも必ず**取り置かれます**。会話の中では一行の要点だけを
見て、全体の差分は別の場所で確かめます。

```
/skills pending             # list staged skill writes + a one-line gist each
/skills diff <id>           # full unified diff (best viewed in CLI or dashboard)
/skills approve <id>        # apply it (or 'all')
/skills reject <id>         # drop it (or 'all')
/skills approval on         # turn the gate on (or 'off') and persist it
```

メッセージングのプラットフォームでは、要点と付随する情報を見てスキルを承認します。
変更を丸ごと読みたいときは、CLI かダッシュボードで `/skills diff` を開くか、
`~/.hermes/pending/skills/<id>.json` に取り置かれたファイルを見てください。
詳しくは [エージェントによるスキルの書き込みに関門を掛ける](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval) をご覧ください。

## 外部のメモリープロバイダー {#external-memory-providers}

MEMORY.md と USER.md の先にある、もっと深くて長く残る記憶のために、Hermes は 8 つの外部メモリープロバイダーのプラグインを同梱しています。Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover、Supermemory です。

外部のプロバイダーは、組み込みの記憶を置き換えるのではなく**並んで**動き、知識のグラフ、意味での検索、事実の自動の抜き出し、セッションをまたいだ利用者の把握といった力を足します。

```bash
hermes memory setup      # pick a provider and configure it
hermes memory status     # check what's active
```

それぞれのプロバイダーの詳しい説明、設定のしかた、比べたものについては、[メモリープロバイダー](/hermes/docs/user-guide/features/memory-providers/) の手引きをご覧ください。
