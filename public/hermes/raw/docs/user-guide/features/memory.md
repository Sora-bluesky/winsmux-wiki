---
title: "ずっと残る記憶"
description: "Hermes Agent がセッションをまたいで覚えておく仕組み — MEMORY.md、USER.md、そしてセッションの検索"
upstream_path: user-guide/features/memory.md
upstream_blob: ee3c226c8e619feeef8438848d50ec14e06efcf9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
---

# ずっと残る記憶 {#persistent-memory}

Hermes Agent は、量に上限があり、手を入れて整えられた記憶をセッションをまたいで持ち続けます。おかげで、好み、進めている案件、動いている環境、そして学んだことを覚えていられます。

## 仕組み {#how-it-works}

エージェントの記憶は2つのファイルでできています。

| ファイル | 役割 | 文字数の上限 |
|------|---------|------------|
| **MEMORY.md** | エージェント自身のメモ — 環境についての事実、決まりごと、学んだこと | 2,200 文字（約 800 トークン） |
| **USER.md** | 利用者の人物像 — 好み、話し方の好み、期待していること | 1,375 文字（約 500 トークン） |

どちらも `~/.hermes/memories/` に保存され、セッションの開始時に凍らせた写しとしてシステムプロンプトへ差し込まれます。エージェントは `memory` ツールで自分の記憶を管理します — 項目の追加、置き換え、削除ができます。

:::caution Hermes ホーム1つにつきエージェントは1つ
2つのエージェントのプロセスを同じ Hermes のホームディレクトリに向けないでください。記憶の書き込みは自動で行われ、セッションの開始時にシステムプロンプトへ読み戻されます。そのため1つのホームを共有する2人の書き手は、互いの項目を積み重ねて、どちらも（そしてこちらも）書いた覚えのない状態を作り上げてしまいます。記憶は設計として[プロファイル](/hermes/docs/user-guide/profiles/)ごとに区切られています — 2つ目のエージェントには自分のプロファイルを与えてください。記憶を共有させたいなら、代わりに[外部の記憶プロバイダ](/hermes/docs/user-guide/features/memory-providers/)を使います。
:::

:::info
文字数の上限は、記憶を要点に絞ったままにするためのものです。記憶は自動で詰め直され**ません**。書き込みが上限を超えそうなときは、`memory` ツールが黙って項目を落とすのではなくエラーを返します。エージェントはそのあと自分で場所を空けます — 同じターンのうちに項目をまとめたり消したりしてから、やり直します（[記憶がいっぱいになったときの動き](#what-happens-when-memory-is-full)を参照）。`replace` も同じく上限に縛られる点に注意してください。ある項目をより長いものに入れ替えれば、それでもあふれることがあります。収まるように新しい中身を短くするか、別の項目を消す必要があります。
:::

## 記憶がシステムプロンプトにどう現れるか {#how-memory-appears-in-the-system-prompt}

すべてのセッションの開始時に、記憶の項目がディスクから読み込まれ、凍らせたブロックとしてシステムプロンプトへ描き出されます。

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

この形には次のものが含まれます。
- どちらの保管場所か（MEMORY か USER PROFILE か）を示す見出し
- 使用率と文字数。エージェントが残りの余裕を把握できます
- `§`（セクション記号）で区切られた個々の項目
- 項目は複数行にわたっても構いません

**凍らせた写しという作り方:** システムプロンプトへの差し込みはセッションの開始時に一度だけ切り取られ、セッションの途中で変わることはありません。これは意図したものです — LLM の先頭部分のキャッシュを保ち、速さを損なわないためです。エージェントがセッションの途中で記憶の項目を足したり消したりすると、その変更はすぐディスクへ書き込まれますが、次のセッションが始まるまでシステムプロンプトには現れません。ツールの応答は、つねに今の状態を映します。

## 記憶にはセッションの区切りが要る {#memory-needs-session-boundaries}

記憶の仕組みは全体が、セッションが**終わる**瞬間を軸に作られています。`MEMORY.md` と `USER.md` が大事なことを次のセッションへ持ち越し、前の文脈が消えたあとの抜けを `session_search` が埋めます。1 つのセッションの中では、この仕組みが動く理由がありません。大事なことはまだ生きた文脈の中にあるので、エージェントが `session_search` を引くことはめったになく、記憶の項目も整理するより詰めて縮めることがほとんどです。

これが効いてくるのがメッセージ用のプラットフォーム（Telegram、Discord など）です。そこでは 1 つのチャットが、あえて [ひと続きのセッション](/hermes/docs/user-guide/sessions/#session-continuity) として扱われ、再起動やゲートウェイのクラッシュ、端末の再起動をまたいで続きます。夜のあいだ端末の電源を落としても、セッションは終わり**ません**。次のメッセージが来ると、ちょうど止まったところから再開します。一度もリセットしなければ、1 つのチャットが何週間も 1 つのセッションとして続くこともあります。便利ですが、費用はかさんでいきます（どんどん長くなる履歴に対して圧縮が何度も走ります）。そして *忘れる → 記憶から思い出す → 過去のセッションを検索する* という学びの流れが、ほとんど動く機会を得られません。新しく足した記憶の項目も、上で説明した凍らせた写しのせいで、動いているセッションからは見えないままです。

**実践:** 自然な区切り — 作業が終わったとき、話題が変わったとき、1 日の始まり — で `/new` を実行してください。区切りのたびに記憶が役に立ちます。エージェントは更新された `MEMORY.md`/`USER.md` の写しを読み直し、安くて短い文脈から始め、本当に履歴が要るときに `session_search` を使います。CLI ではたいてい自然にそうなります（起動するたびに新しいセッションです）。ゲートウェイでは、区切りを作るのは使う人の役目です。

## 困ったとき: 「覚えてと言ったのに、次のセッションでは忘れていた」 {#troubleshooting-i-told-it-to-remember-and-the-next-session-it-forgot}

いちばんよく届く報告はこういうものです。何がどこにあるか（Obsidian の保管庫、プロジェクトのディレクトリ、サーバーなど）をエージェントに伝えると、「はい、覚えました」と返ってくる。ところが新しいセッションを始めると、まるで心当たりがない。次の順に確かめてください。最初の 1 つで、ほとんどの場合は説明が付きます。

1. **本当に書き込まれたかを確かめます。** 記憶が残るのは、モデルが *`memory` ツールを呼んだ* ときだけです。「記憶に追加しました」という一文は、ただの文章でしかありません。ファイルを開いて、その項目があるか見てください。

   ```bash
   cat ~/.hermes/memories/MEMORY.md
   cat ~/.hermes/memories/USER.md
   ```

   そこに書かれていなければ、モデルはしていない保存をしたと言ったことになります。手元で動かす小さなモデル（おおよそ 30B パラメータ未満）や、道具の呼び出しが弱いモデルでは、よく起こります。道具を呼ばないまま、確認の返事だけを作ってしまうのです。「`memory` ツールを使って、保管庫のパス `/srv/vault` を保存して」のようにはっきり頼み、ファイルに項目が入ったことを確かめてください。それでも繰り返すなら、直し方は指示を増やすことではなく、初期設定のときだけ強いモデルを使うことです。項目さえできてしまえば、それはシステムプロンプトに入って届くので、小さなモデルでも問題なく読めます。

2. **書き込みが保留になっていないかを確かめます。** `write_approval: true` にしていると、対話形式の CLI の外からの書き込みは確認待ちで止められ、承認するまでファイルには届きません。`/memory pending` と `/memory approve all` を実行してください。詳しくは [記憶への書き込みを制御する](#controlling-memory-writes-write_approval) をご覧ください。

3. **書いたときと同じ記憶を読んでいるかを確かめます。** 記憶は [プロファイル](/hermes/docs/user-guide/profiles/) ごとに分かれています。`hermes -p work`（あるいは `work chat` / `work gateway start`）が読むのは `~/.hermes/profiles/work/memories/` で、`~/.hermes/memories/` ではありません。既定のプロファイルの CLI セッションと、別のプロファイルで動く Telegram のボットは、メモを共有しません。何があるかは `hermes profile list` で分かります。

4. **記憶が有効になっているかを確かめます。** `memory.memory_enabled: false`（または `agent.disabled_toolsets` の下の `memory`）を指定すると、道具そのものがなくなります。モデルが何と言おうと、保存はできません。詳しくは [設定](#configuration) をご覧ください。

5. **写しはセッションの開始時に凍ることを思い出してください。** いまのセッションで保存したことが見えるのは *次の* セッションであって、すでに動いていた別のセッションではありません。書き込んだあとに、新しいセッションを始めてください（`/new`、または CLI を起動し直します）。

エージェントに覚えさせる手段では **ない** ものが 2 つあります。`.env` の変数（これは認証情報と設定であって、記憶ではありません）と、保存を頼まないまま会話の中で触れただけのことです。繰り返し動かす作業のたびにエージェントが必要とする場所なら、記憶の項目より [skill](/hermes/docs/user-guide/features/skills/) のほうが置き場所として向いていることが多いです。skill は関係のあるときだけ読み込まれ、2,200 文字の枠を奪い合いません。

## memory ツールの操作 {#memory-tool-actions}

エージェントは `memory` ツールを次の操作で使います。

- **add** — 新しい記憶の項目を足す
- **replace** — 既にある項目を、新しい中身に置き換える（`old_text` による部分一致で探します）
- **remove** — もう関係のなくなった項目を消す（`old_text` による部分一致で探します）

`read` にあたる操作はありません — 記憶の中身は、セッションの開始時にシステムプロンプトへ自動で差し込まれます。エージェントは自分の記憶を、会話の文脈の一部として見ています。

### 部分一致で探す {#substring-matching}

`replace` と `remove` の操作は、短くて重複のない部分一致で対象を探します — 項目の全文を渡す必要はありません。`old_text` に必要なのは、ちょうど1つの項目を言い当てられる、重複のない部分文字列だけです。

```python
# If memory contains "User prefers dark mode in all editors"
memory(action="replace", target="memory",
       old_text="dark mode",
       content="User prefers light mode in VS Code, dark mode in terminal")
```

その部分文字列が複数の項目に当たった場合は、もっと絞り込むよう求めるエラーが返ります。

## 2つの宛先 {#two-targets-explained}

### `memory` — エージェント自身のメモ {#memory-agents-personal-notes}

環境、進め方、学んだ教訓について、エージェントが覚えておく必要のあることを入れます。

- 環境についての事実（OS、道具、案件の構成）
- その案件の決まりごとと設定
- 見つけた道具の癖と、その回避のしかた
- 終わった作業の日誌としての記録
- うまくいった skill や手口

### `user` — 利用者の人物像 {#user-user-profile}

利用者が何者か、何を好むか、どう話したいかについての情報を入れます。

- 名前、役割、時間帯
- 話し方の好み（簡潔か詳しいか、形式の好み）
- 嫌なこと、避けてほしいこと
- 仕事の進め方の癖
- 技術の習熟度

## 何を残し、何を残さないか {#what-to-save-vs-skip}

### 残すもの（頼まれなくても） {#save-these-proactively}

エージェントは自動で保存します — こちらから頼む必要はありません。次のことを知ったときに保存します。

- **利用者の好み:** 「JavaScript より TypeScript のほうが好き」→ `user` へ
- **環境についての事実:** 「このサーバーは Debian 12 と PostgreSQL 16 で動いている」→ `memory` へ
- **訂正:** 「Docker のコマンドに `sudo` は要らない。利用者は docker グループに入っている」→ `memory` へ
- **決まりごと:** 「この案件はタブ、1行 120 文字、Google 形式の docstring」→ `memory` へ
- **終わった作業:** 「2026-01-15 にデータベースを MySQL から PostgreSQL へ移した」→ `memory` へ
- **はっきりした依頼:** 「API キーの入れ替えは月に1回だと覚えておいて」→ `memory` へ

### 残さないもの {#skip-these}

- **ささいな情報、当たり前の情報:** 「利用者が Python について聞いた」 — 漠然としていて役に立ちません
- **すぐ調べ直せる事実:** 「Python 3.12 は f-string の入れ子に対応している」 — Web で検索できます
- **生のデータの丸写し:** 大きなコードのかたまり、ログ、データの表 — 記憶に入れるには大きすぎます
- **そのセッションかぎりのもの:** 一時的なファイルの場所、その場かぎりの調査の文脈
- **すでに文脈ファイルにある情報:** SOUL.md と AGENTS.md の中身

## 容量のやりくり {#capacity-management}

システムプロンプトが膨らまないよう、記憶には厳しい文字数の上限があります。

| 保管場所 | 上限 | だいたいの項目数 |
|-------|-------|----------------|
| memory | 2,200 文字 | 8〜15 項目 |
| user | 1,375 文字 | 5〜10 項目 |

### 記憶がいっぱいになったときの動き {#what-happens-when-memory-is-full}

上限を超えてしまう項目を足そうとすると、ツールはエラーを返します。

```json
{
  "success": false,
  "error": "Memory at 2,100/2,200 chars. Adding this entry (250 chars) would exceed the limit. Consolidate now: use 'replace' to merge overlapping entries into shorter ones or 'remove' stale or less important entries (see current_entries below), then retry this add — all in this turn.",
  "current_entries": ["..."],
  "usage": "2,100/2,200"
}
```

エージェントはそのあと、こう動くはずです。
1. いまの項目を読む（エラーの応答に載っています）
2. 消せる項目、まとめられる項目を見つける
3. `replace` で近い項目どうしをより短い形にまとめる
4. そのうえで新しい項目を `add` する

**うまいやり方:** 記憶が容量の 80% を超えたら（システムプロンプトの見出しで分かります）、新しいものを足す前に項目をまとめてください。たとえば「この案件は X を使う」という3つの別々の項目を、案件全体を言い表す1つの項目にまとめます。

### 良い記憶の項目の実例 {#practical-examples-of-good-memory-entries}

**短くて、情報の詰まった項目がいちばん効きます。**

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

## 重複を防ぐ {#duplicate-prevention}

記憶の仕組みは、まったく同じ項目を自動ではねます。すでにある中身を足そうとすると、「重複は足さなかった」という知らせとともに成功が返ります。

## 安全の検査 {#security-scanning}

記憶の項目はシステムプロンプトへ差し込まれるものなので、受け付ける前に注入と持ち出しの手口がないか検査されます。脅威の型（プロンプトの注入、資格情報の持ち出し、SSH の裏口）に当たる中身や、目に見えない Unicode の文字を含むものは、そこで止められます。

## セッションの検索 {#session-search}

MEMORY.md と USER.md のほかに、エージェントは `session_search` ツールで過去の会話を探せます。

- CLI とメッセージ系のセッションはすべて SQLite（`~/.hermes/state.db`）に保存され、FTS5 の全文検索が効きます
- 検索は DB にある実際のメッセージを返します — LLM による要約も、途中での打ち切りもありません
- 数週間前に話したことでも、いまの記憶に載っていなければ探し出せます
- 見つけたセッションの中を、前後に読み進めることもできます

```bash
hermes sessions list    # Browse past sessions
```

3つの呼び出しの形（探す / 読み進める / 眺める）と応答の形式は、[セッション検索ツール](/hermes/docs/user-guide/sessions/#session-search-tool)を参照してください。

### session_search と memory の違い {#sessionsearch-vs-memory}

| 項目 | ずっと残る記憶 | セッションの検索 |
|---------|------------------|----------------|
| **容量** | 全体で約 1,300 トークン | 上限なし（すべてのセッション） |
| **速さ** | すぐ（システムプロンプトの中） | FTS5 の検索で約 20ms、読み進めは約 1ms |
| **費用** | すべてのプロンプトにトークンの費用がかかる | 無料 — LLM を呼びません |
| **使いどころ** | いつでも手元にあってほしい要点 | 過去の特定の会話を探す |
| **管理** | エージェントが手で整える | 自動 — すべてのセッションが保存される |
| **トークンの費用** | セッションごとに固定（約 1,300 トークン） | 必要なときだけ（検索したときに） |

**記憶**は、つねに文脈にあってほしい肝心な事実のためのものです。**セッションの検索**は、「先週 X の話をしたっけ？」のように、過去の会話から細かいところを思い出す必要があるときのものです。

## 学びの道のり（`/journey`） {#learning-journey-journey}

学びの道のりは、Hermes が学んできたすべてを時間の流れで見る画面です — 保存された skill と記憶の項目が時系列に並び（上が古く、下が新しい）、積み上がっていく様子を再生できる「星座」のつまみが付いています。同じグラフのデータが、3つの画面を動かします。

- **昔ながらの CLI / 単体で使う** — `hermes journey`（別名: `hermes learning`、`hermes memory-graph`）が、時間の流れをターミナルに描きます。オプション: `--play` で積み上がりを動かし（`--fps` で速さを調整）、`--width`／`--height` で描く大きさを指定し、`--no-color` で色を消し、`--json` でグラフの生のデータを吐き出します。
- **TUI** — `/journey`（別名: `/learning`、`/memory-graph`）が、時間の流れを重ねて表示します。
- **デスクトップアプリ** — `/journey` で Star Map（記憶のグラフ）のパネルが開きます。同じ節点を触って動かせる画面です。

skill は、学びの手がかりができた時点で時間の流れに現れます。手がかりとは、この profile の中で作られたこと（`/learn` の結果や、前面での `skill_manage` による作成）、裏側の振り返りで作られたこと、または一度でも使われたことです。同梱の skill や、手で書いたまま一度も使われていない skill は、時間の流れには出てきません。

見るだけでなく、Hermes が学んだことを**間引いたり直したり**するのも、この道のりの画面です。

| コマンド | 何をするか |
|---------|--------------|
| `hermes journey list` | 節点の id を並べます — skill の名前と、記憶のかたまりの `memory:<source>:<index>` という id です。 |
| `hermes journey delete <node> [-y]` | 節点を消します。skill は**書庫に入る**ので戻せます。記憶のかたまりは取り除かれます。`-y` で確認を飛ばします。 |
| `hermes journey edit <node>` | その節点の中身（skill なら `SKILL.md`、記憶ならそのかたまり）を `$EDITOR` で開きます。 |

同じ `list` / `delete <id>` / `edit <id>` の下位コマンドは、CLI のチャット内で使う `/journey` コマンドからも動きます。デスクトップのパネルでは、節点の上で直接その場で編集・削除ができます。

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

`memory_enabled` と `user_profile_enabled` の**両方**を `false` にすると、組み込みの保管場所は完全に切れます。`memory` ツールは仕様から外され、その案内のブロックもシステムプロンプトから外されるので、使えない道具の話をモデルが聞かされることはありません。`memory.provider` で指定した外部のプロバイダ（Hindsight、Mem0、Honcho、…）はこの影響を受けず、自分の道具を持ったままです — 組み込みのファイル*ではなく*、よその記憶の仕組みを使いたいときにこうします。`agent.disabled_toolsets` に `memory` を並べるのは、もっと重いスイッチです。外部プロバイダの道具まで隠してしまいます。

`memory_enabled: false` だけにした場合（利用者の人物像は生きたまま）、ツールは残ります — 人物像の保管場所を支えているからです — が、システムプロンプトのほうは、記憶についての案内が丸ごと、人物像だけを扱う狭いブロックに差し替わります。ツールの仕様は `user` の宛先だけを見せ、切ってある `MEMORY.md` への直接の書き込みも下書きとしての書き込みもはねられます。逆の設定なら、見せるのは `memory` だけになり、`USER.md` への書き込みがはねられます。

## 記憶の書き込みを止めておく（`write_approval`） {#controlling-memory-writes-writeapproval}

既定では、エージェントは自由に記憶を保存します — ターンのあとに走る、裏側での自己改善の見直しからの保存も含みます。先に承認を挟みたいなら、`memory.write_approval: true` にしてください。表のターンと裏側の見直しの**両方**にかかる、単純な入り切りの関門です。

| `write_approval` | ふるまい |
|------------------|-----------|
| `false`（既定） | 自由に書き込みます — 関門は切れています（この関門ができる前と同じ動きです）。 |
| `true` | 何かを保存する前に承認を求めます。対話式の CLI では、表のターンの書き込みはその場で確認を出します（項目は全文を読み切れる短さです）。それ以外のところ — メッセージ系のサービス、スクリプト、裏側の自己改善の見直し — では、書き込みは `/memory pending` で見直せるよう**下書きに回されます**。 |

> 記憶を関門で止めるのではなく完全に切りたいなら、`memory_enabled: false` と `user_profile_enabled: false` の両方を設定してください。組み込みの保管場所が両方とも切れているとき、組み込みの `memory` ツールは自動で隠れます。

下書きに回った書き込みは、CLI からでもメッセージ系のサービスからでも見直せます。

```
/memory pending             # list staged memory writes (auto ones tagged [auto])
/memory approve <id>        # apply one (or 'all')
/memory reject <id>         # drop one (or 'all')
/memory approval on         # turn the gate on (or 'off') and persist it
```

これが「エージェントが自分について間違った思い込みを保存した」への答えです。`write_approval: true` にしておけば、すべての保存 — とりわけ頼んでいない裏側からのもの — が、人物像に入る前にこちらの可否を待ちます。

## 裏側の見直しの知らせ（`display.memory_notifications`） {#background-review-notifications-displaymemorynotifications}

ターンのあと、裏側の自己改善の見直しが、そっと記憶を保存したり skill を更新したりすることがあります。これは Hermes の、同意を意識した学びの輪です。繰り返された訂正や、長く効く進め方の教訓が、短い記憶の項目や手順の skill になります。`write_approval` を使えば、その書き込みを、次からのセッションに効いてくる前に下書きへ回して見直せます。既定では、起きたことが分かるよう `💾 Memory updated` という短い行がチャットに出ます。どれくらい喋らせるかは調整できます。

```yaml
display:
  memory_notifications: on    # off | on (default) | verbose
```

| 値 | ふるまい |
|-------|-----------|
| `off` | チャットに知らせを出しません。見直し自体は走り、書き込みも行われます — 行が見えないだけです。 |
| `on`（既定） | ひとまとめの行が出ます。たとえば `💾 Memory updated`、`💾 Skill 'foo' patched`。 |
| `verbose` | 何が変わったかの短い下見が付きます。たとえば `💾 Memory ➕ User prefers terse replies` や、`"old" → "new"` の形をした skill の差分の切れ端です。 |

> これが決めるのは**ゲートウェイ**のチャットに出る知らせだけです。見直しそのものと、記憶や skill の保管場所への書き込みは、この設定の影響を受けません。サービスごとに変えたいときは `display.platforms.<platform>.memory_notifications` で設定します。

skill のまとまった書き込みが成功したときは、`on` でも `verbose` でも、実際に適用された操作をひとつずつ名前で挙げます。付随するファイルの書き込みや削除、skill の削除も含みます。承認待ちの下書きと、巻き戻されたまとまりは、終わった変更としては報告されません。まとまりの要約は、頼まれた書き込みが走ったと決めつけるのではなく、実際に適用された結果を使います。

## 見直しを安いモデルで走らせる（`auxiliary.background_review`） {#running-the-review-on-a-cheaper-model-auxiliarybackgroundreview}

見直しは既定で**普段のチャットのモデル**で走り、会話をなぞり直します — その会話はすでにプロンプトのキャッシュで温まっているので、キャッシュの読み出しとして安く済みます。高いモデルを普段使いにしているなら、見直しだけ安いモデルで走らせられます。

```yaml
auxiliary:
  background_review:
    provider: openrouter
    model: google/gemini-3-flash-preview   # auto (default) = main chat model
```

普段のものと**違う**モデルを指すと、見直しはそちらでかなり安く走ります（試した範囲で 3〜5 倍ほど）。違うモデルはどのみち普段のモデルのプロンプトのキャッシュを使い回せないので、この分身は会話の全文ではなく、短い**要旨**（直近のターンはそのまま + それより古い分の要約）をなぞり直します — 新しいキャッシュに書き込む量を最小にするためです。拾えるものは変わりません。試験では、記憶の拾い上げは同じで、skill の拾い上げも普段のモデルでの見直しとほぼ同じでした。

`auto` のままにする（あるいは普段のモデルを指定する）と、何も変わりません — 見直しは、温まったキャッシュを使う全文のなぞり直しのまま、普段のモデルで走り続けます。

### 同じモデルで見直すときの推論 {#same-model-review-reasoning}

親と同じモデルを使う見直しは、**つねに親の推論の強さを引き継ぎます**。`auxiliary.background_review.reasoning_effort` を設定しても上書きはできません。振り分けが `auto` でも、親のプロバイダ／モデルをはっきり選んでいても同じです。

推論の設定、システムプロンプト、会話の写し全体、ツールの定義は、分身が生まれた時点で親とバイト単位で同じままに保たれます。見直しがプロンプトのキャッシュの先頭部分を使い回せるようにするためです。見直しの考える深さだけを変えると、その一致が崩れてしまいます。同じモデルでの見直しに、推論の強さを別立てにするスイッチはありません。

普段の会話の強さを変えずに見直しの手間を減らしたいなら、`memory.nudge_interval` / `skills.creation_nudge_interval` を調整するか、下に書くやり方で自動の見直しを切るか、見直しを別のモデルへ振り分けてください。別のモデルへの振り分けは要旨を使うので、親の温まった先頭部分を共有しません。その振り分けでは `auxiliary.background_review.reasoning_effort` が実際に効きます（未設定なら振り分け先プロバイダーの既定値です）。このキーを設定していても見直しが主モデルのままのときは、一度だけ警告が表示されます。ここに挙げた頻度と振り分けの調整では、同じモデルのときの推論を切り離すことはできません。

### 自動の見直しを切る（`enabled`） {#disabling-automatic-reviews-enabled}

混み合ったホストでは、見直しの分身が全体のトークンのうち無視できない割合を使うことがあります。運用する側は、うながしの間隔をゼロにしなくてもこれを切れます。

```yaml
auxiliary:
  background_review:
    enabled: true              # false = skip automatic post-turn forks
```

`enabled: false` にすると、ターンのあとの自動の分身は生まれなくなります。手で呼ぶ `/refine` はそのまま動きます。

### 見直しの費用に上限を設ける（`max_input_tokens`） {#capping-review-cost-maxinputtokens}

見直しのループは、プロバイダへリクエストを出すたびに会話をなぞり直します。そのため 1 回の見直しでも、道具を使う回数の分だけ入力トークンが膨らみます。`max_input_tokens` は、1 回の見直しでなぞり直す入力トークンの合計に上限をかけるもので、ループはその値を超える手前で止まります。`<= 0` を指定すると上限なしです。

```yaml
auxiliary:
  background_review:
    max_input_tokens: 48000  # <= 0 = unlimited
```

このキーを設定していない場合、予算は見直し用モデルの実際のコンテキストウィンドウから決まります。ウィンドウの 75%、上限は 600,000 トークンです。こうしておくと、手元の小さなモデルにもきちんと効きます（65,536 トークンのモデルなら 49,152 になります）。クラウド規模の固定値を既定にしていたら、こうした場面ではまったく効きません。ウィンドウが判明しない場合は、控えめな 120,000 トークンが代わりに使われます。なお、このキーは `auxiliary:` の下に置きます。最上位に書いた `background_review:` のブロックは読まれません。

分身の使用量は `session_model_usage` に `task='background_review'` として残り、完了の行が `agent.log` に書かれます（`Background review complete: thread=bg-review calls=… in=… out=… result=…`）。

### 見直しに追加の道具を狭く許す（`extra_tools`） {#allowing-a-narrowly-scoped-extra-review-tool-extratools}

裏側の見直しは、既定で記憶、skill の管理、読み取り専用のファイル操作の道具を使えます。人が見ていない見直しでも安全な道具をプロファイルが用意しているなら、名前を挙げて加えてください。

```yaml
auxiliary:
  background_review:
    extra_tools:
      - propose_shared_memory
```

その道具は、親のエージェントがすでに使えるものでなければなりません。この設定は、見直しの分身が実行時に使ってよいものの一覧へ加えるだけです。好き勝手な道具を有効にするものではなく、ここに挙がっていない道具は拒まれたままです。一覧は狭く保ち、外向きの変更や取り返しのつかない変更をその場で行うものより、人の目に回すための提案を作る道具を選んでください。既定は空の一覧です。

### 手元のモデル: 見直しは GPU が空くのを待つ（`defer`） {#local-models-reviews-wait-for-an-idle-gpu-defer}

クラウドのプロバイダなら、見直しは数秒で終わり、次に何をしていても横で走ります。見直しの実行先が**管理された手元の llama-server**（設定 → Local models）のときは、同じ分身が、次のプロンプトに必要な GPU を占めてしまいます — 大きなモデルでは何分も、です。しかも新しいプロンプトを送るとそれが打ち切られ、学びが捨てられます。そこで管理された手元の実行先では、見直しは**既定で後回し**になります。ターンの終わりに順番待ちへ入り、機械が短いあいだ静かになったら実行されます。見直しそのものは何も変わりません — 同じモデル、同じ全文のなぞり直し、同じ書き込みで、動く瞬間だけがずれます。

```yaml
auxiliary:
  background_review:
    defer: auto            # auto (default) | never
    defer_max_age_s: 1800  # run a queued review anyway after this long
```

| 値 | ふるまい |
|-------|-----------|
| `auto`（既定） | 実行先が管理された手元のサーバーに決まる見直しは順番待ちに入り、手が空いたときに走ります。それ以外の実行先（クラウド、外部のサーバー）は、これまでどおりすぐ生まれます。 |
| `never` | どこでも昔の動きにします。管理された手元の GPU の上でも、ターンの終わりにすぐ生まれます。 |

順番待ちの見直しはセッションごとにひとつにまとめられ（新しいターンの写しが古いものと入れ替わります — 見直しは会話全体をなぞり直すので、失われるものはありません）、新しいプロンプトに割り込まれた見直しは捨てられずに順番待ちへ戻り、`defer_max_age_s` より長く待った見直しは、機械がいつまでも空かなくても走ります。はっきり呼んだ `/refine` はいつでもすぐ走ります。順番待ちはメモリ上のもので、アプリを終えた時点でまだ待っていた見直しは捨てられます。走っている最中の分身と同じ扱いです。

## skill の書き込みを止めておく（`skills.write_approval`） {#controlling-skill-writes-skillswriteapproval}

skill も同じ入り切りの関門を使いますが、見直しのしかたは違います。`SKILL.md` は、チャットの吹き出しで読むにはあまりに大きいからです。

```yaml
skills:
  write_approval: false     # false = write freely (default) | true = require approval
```

`write_approval: true` のとき、skill の書き込み（作成 / 編集 / 部分修正 / write_file / 削除）は、どこから来たものでもかならず**下書きに回ります**。要点の1行はその場で見られますが、差分の全文は別のところに置かれます。

```
/skills pending             # list staged skill writes + a one-line gist each
/skills diff <id>           # full unified diff (best viewed in CLI or dashboard)
/skills approve <id>        # apply it (or 'all')
/skills reject <id>         # drop it (or 'all')
/skills approval on         # turn the gate on (or 'off') and persist it
```

メッセージ系のサービスでは、要点と付随する情報から skill を承認できます。変更の全体を読みたくなったら、CLI やダッシュボードで `/skills diff` を開くか、`~/.hermes/pending/skills/<id>.json` に置かれた下書きのファイルを開いてください。詳しくは[エージェントの skill の書き込みを関門で止める](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval)にあります。

## 外部の記憶プロバイダ {#external-memory-providers}

MEMORY.md と USER.md の先にある、もっと深く長く残る記憶のために、Hermes は8つの外部の記憶プロバイダのプラグインを同梱しています — Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover、Supermemory です。

外部のプロバイダは、組み込みの記憶と**並んで**動き（置き換えることはありません）、知識のグラフ、意味での検索、事実の自動の抜き出し、セッションをまたいだ利用者の像づくりといった力を足します。

```bash
hermes memory setup      # pick a provider and configure it
hermes memory status     # check what's active
```

それぞれのプロバイダの詳しい話、設定の手順、比べた表は、[記憶プロバイダ](/hermes/docs/user-guide/features/memory-providers/)の案内を参照してください。
