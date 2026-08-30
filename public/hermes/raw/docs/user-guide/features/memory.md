---
title: "ずっと残る記憶"
description: "Hermes Agent がセッションをまたいで覚えておく仕組み — MEMORY.md、USER.md、そしてセッションの検索"
upstream_path: user-guide/features/memory.md
upstream_blob: b8c79dbc77d538edc46592a85523463c86b2f45e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
---

# ずっと残る記憶 {#persistent-memory}

Hermes Agent は、大きさに上限があり、選りすぐられた記憶をセッションをまたいで持ち続けます。おかげで、あなたの好み、あなたのプロジェクト、あなたの環境、そして学んだことを覚えていられます。

## 仕組み {#how-it-works}

エージェントの記憶は 2 つのファイルでできています。

| ファイル | 役割 | 文字数の上限 |
|------|---------|------------|
| **MEMORY.md** | エージェント自身の覚え書き — 環境の事実、決めごと、学んだこと | 2,200 文字（約 800 トークン） |
| **USER.md** | 利用者の人物像 — 好み、話し方の好み、期待していること | 1,375 文字（約 500 トークン） |

どちらも `~/.hermes/memories/` に置かれ、セッションの開始時に凍らせた写しとしてシステムプロンプトに差し込まれます。エージェントは `memory` の道具で自分の記憶を管理し、項目の追加・置き換え・削除ができます。

:::caution Hermes のホームひとつにつきエージェントはひとつ
2 つのエージェントのプロセスを、同じ Hermes のホームディレクトリに向けないでください。記憶の書き込みは自動で、セッションの開始時にシステムプロンプトへ読み戻されます。ホームを共有する 2 人の書き手は、互いの項目を積み重ねて、どちらも（そしてあなたも）書いた覚えのない状態を作ってしまいます。記憶は設計上 [プロファイル](/hermes/docs/user-guide/profiles/) ごとに分かれています。2 台目のエージェントには自分のプロファイルを与えてください。記憶を共有したいなら、[外部の記憶プロバイダー](/hermes/docs/user-guide/features/memory-providers/) を使ってください。
:::

:::info
文字数の上限は、記憶を要点に絞るためのものです。記憶は自動では詰め直されません。上限を超える書き込みが来ると、`memory` の道具は黙って項目を捨てるのではなく、エラーを返します。エージェントはそのあと自分で場所を空けます。同じターンのうちに項目をまとめたり消したりしてから、もう一度試します（[記憶がいっぱいになったとき](#what-happens-when-memory-is-full) を参照）。`replace` も上限に縛られる点に注意してください。ある項目をより長いものに差し替えると、それでも溢れることがあります。その場合は新しい中身を短くするか、別の項目を消して収める必要があります。
:::

## 記憶がシステムプロンプトにどう現れるか {#how-memory-appears-in-the-system-prompt}

どのセッションでも開始時に、記憶の項目がディスクから読み込まれ、凍らせた塊としてシステムプロンプトに描き出されます。

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

この形式には次のものが含まれます。
- どちらの置き場か（MEMORY か USER PROFILE か）を示す見出し
- 使用率と文字数。エージェントが残りの余裕を把握するため
- `§`（節記号）で区切られた個々の項目
- 項目は複数行でもかまいません

**凍らせた写しという考え方:** システムプロンプトへの差し込みは、セッションの開始時に一度だけ切り取られ、途中で変わることはありません。これは意図してそうしています。LLM の前置きのキャッシュを保って速さを稼ぐためです。セッションの途中でエージェントが記憶の項目を足したり消したりすると、その変更はすぐディスクに書かれますが、システムプロンプトに現れるのは次のセッションからです。道具の応答は、常に今の状態を返します。

## memory の道具でできること {#memory-tool-actions}

エージェントは `memory` の道具を、次の動作で使います。

- **add** — 新しい記憶の項目を足す
- **replace** — 既にある項目を、更新した中身に置き換える（`old_text` による部分一致を使います）
- **remove** — 当てはまらなくなった項目を消す（`old_text` による部分一致を使います）

`read` の動作はありません。記憶の中身はセッションの開始時に自動でシステムプロンプトへ差し込まれるからです。エージェントは自分の記憶を、会話の文脈の一部として見ています。

### 部分一致 {#substring-matching}

`replace` と `remove` の動作は、短くて他とかぶらない部分一致を使います。項目の全文を書く必要はありません。`old_text` は、ちょうどひとつの項目を言い当てられる、かぶりのない部分文字列であれば足ります。

```python
# If memory contains "User prefers dark mode in all editors"
memory(action="replace", target="memory",
       old_text="dark mode",
       content="User prefers light mode in VS Code, dark mode in terminal")
```

その部分文字列が複数の項目に当たる場合は、もっと絞り込むよう促すエラーが返ります。

## 2 つの置き場について {#two-targets-explained}

### `memory` — エージェント自身の覚え書き {#memory-agents-personal-notes}

環境、作業の進め方、学んだ教訓について、エージェントが覚えておくべきことを入れます。

- 環境の事実（OS、道具、プロジェクトの構成）
- プロジェクトの決めごとと設定
- 道具の癖と、見つけた回避のやり方
- 終えた仕事の記録
- うまくいったスキルや手口

### `user` — 利用者の人物像 {#user-user-profile}

利用者の素性、好み、話し方の好みについての情報を入れます。

- 名前、役割、時間帯
- 話し方の好み（簡潔か詳しいか、書式の好み）
- 嫌なこと、避けてほしいこと
- 仕事の進め方の癖
- 技術の習熟度

## 残すもの、残さないもの {#what-to-save-vs-skip}

### 残すもの（頼まれなくても） {#save-these-proactively}

エージェントは自動で残します。頼む必要はありません。次のようなことを知ったときに残します。

- **利用者の好み:** 「JavaScript より TypeScript が好き」 → `user` へ
- **環境の事実:** 「このサーバーは Debian 12 で PostgreSQL 16 が動いている」 → `memory` へ
- **訂正:** 「Docker のコマンドに `sudo` は要らない。利用者は docker グループに入っている」 → `memory` へ
- **決めごと:** 「このプロジェクトはタブ、1 行 120 文字、Google 形式の docstring」 → `memory` へ
- **終えた仕事:** 「2026-01-15 にデータベースを MySQL から PostgreSQL へ移した」 → `memory` へ
- **はっきりした頼みごと:** 「API キーの入れ替えは毎月やると覚えておいて」 → `memory` へ

### 残さないもの {#skip-these}

- **ささいなこと、当たり前のこと:** 「利用者が Python について聞いた」 — 漠然としていて役に立ちません
- **すぐ調べ直せる事実:** 「Python 3.12 は f-string の入れ子に対応している」 — ウェブで検索できます
- **生のデータの塊:** 大きなコードの塊、記録ファイル、データの表 — 記憶には大きすぎます
- **そのセッションだけの一時的なもの:** 一時ファイルのパス、その場限りの調査の文脈
- **すでに文脈のファイルにあること:** SOUL.md と AGENTS.md の中身

## 容量の管理 {#capacity-management}

システムプロンプトが膨らまないよう、記憶には厳しい文字数の上限があります。

| 置き場 | 上限 | だいたいの項目数 |
|-------|-------|----------------|
| memory | 2,200 文字 | 8〜15 項目 |
| user | 1,375 文字 | 5〜10 項目 |

### 記憶がいっぱいになったとき {#what-happens-when-memory-is-full}

上限を超えてしまう項目を足そうとすると、道具はエラーを返します。

```json
{
  "success": false,
  "error": "Memory at 2,100/2,200 chars. Adding this entry (250 chars) would exceed the limit. Consolidate now: use 'replace' to merge overlapping entries into shorter ones or 'remove' stale or less important entries (see current_entries below), then retry this add — all in this turn.",
  "current_entries": ["..."],
  "usage": "2,100/2,200"
}
```

エージェントは、そのあと次のようにするべきです。
1. 今ある項目を読む（エラーの応答に載っています）
2. 消せる項目、まとめられる項目を見つける
3. `replace` で関連する項目をより短くまとめる
4. そのうえで新しい項目を `add` する

**こうするとよい:** 記憶が容量の 80% を超えたら（システムプロンプトの見出しで分かります）、新しい項目を足す前にまとめてください。たとえば「このプロジェクトは X を使う」という 3 つの項目を、ひとつのまとまったプロジェクトの説明に合わせます。

### よい記憶の項目の実例 {#practical-examples-of-good-memory-entries}

**短くて中身の詰まった項目がいちばんうまく働きます。**

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

記憶の仕組みは、まったく同じ項目を自動で弾きます。すでにある中身を足そうとすると、「重複は足していない」という知らせとともに成功が返ります。

## セキュリティの検査 {#security-scanning}

記憶の項目はシステムプロンプトに差し込まれるものなので、受け入れる前に、注入や持ち出しの手口が混ざっていないか検査されます。脅威の型に当てはまる中身（プロンプトへの注入、資格情報の持ち出し、SSH の裏口）や、目に見えない Unicode の文字を含むものは弾かれます。

## セッションの検索 {#session-search}

MEMORY.md と USER.md のほかに、エージェントは `session_search` の道具で過去の会話を検索できます。

- CLI とメッセージのセッションはすべて SQLite（`~/.hermes/state.db`）に保存され、FTS5 の全文検索が使えます
- 検索はデータベースにある実際のやり取りを返します。LLM による要約も、途中での打ち切りもありません
- 今の記憶に入っていなくても、何週間も前に話したことを見つけられます
- 見つけたセッションの中を、前後に読み進めることもできます

```bash
hermes sessions list    # Browse past sessions
```

3 つの呼び出しの形（探す／読み進める／眺める）と応答の形式は、[セッション検索の道具](/hermes/docs/user-guide/sessions/#session-search-tool) を見てください。

### session_search と memory の使い分け {#sessionsearch-vs-memory}

| 観点 | ずっと残る記憶 | セッションの検索 |
|---------|------------------|----------------|
| **容量** | 合計で約 1,300 トークン | 無制限（すべてのセッション） |
| **速さ** | 即座（システムプロンプトの中） | FTS5 の検索で約 20ms、読み進めは約 1ms |
| **費用** | どのプロンプトにもトークン代がかかる | 無料 — LLM を呼びません |
| **向いている場面** | 常に手元にあってほしい大事な事実 | 過去の特定の会話を探すとき |
| **管理** | エージェントが手で選りすぐる | 自動 — すべてのセッションが保存される |
| **トークン代** | セッションごとに固定（約 1,300 トークン） | 必要なときだけ（検索したときに発生） |

**記憶** は、常に文脈に入っていてほしい重要な事実のためのものです。**セッションの検索** は「先週 X について話したっけ？」のように、過去の会話から具体的なことを思い出したいときのためのものです。

## 学びの道のり（`/journey`） {#learning-journey-journey}

学びの道のりは、Hermes が学んだことをすべて時系列で見せる画面です。保存されたスキルと記憶の項目が時間の順に並び（上が古く、下が新しい）、その積み上がりを再生できる「星座」のつまみが付いています。同じグラフのデータが、3 つの見せ方を支えています。

- **従来の CLI / 単体で使う** — `hermes journey`（別名: `hermes learning`、`hermes memory-graph`）が、時系列をターミナルに描きます。オプション: `--play` で積み上がりを動かし（速さは `--fps` で調整）、`--width`/`--height` で描く大きさを上書きし、`--no-color` で色を消し、`--json` で生のグラフのデータをそのまま吐き出します。
- **TUI** — `/journey`（別名: `/learning`、`/memory-graph`）が、時系列を重ねて表示します。
- **デスクトップアプリ** — `/journey` で Star Map（記憶のグラフ）のパネルが開きます。同じ節点を対話的に見られる画面です。

見るだけでなく、この道のりは Hermes が学んだことを **刈り込んだり直したり** する場所でもあります。

| コマンド | 何をするか |
|---------|--------------|
| `hermes journey list` | 節点の id を並べます。スキル名と、記憶の断片の `memory:<source>:<index>` の id です。 |
| `hermes journey delete <node> [-y]` | 節点を消します。スキルは **保管** されて元に戻せますが、記憶の断片は削除されます。`-y` で確認を省けます。 |
| `hermes journey edit <node>` | 節点の中身（スキルの `SKILL.md` か、記憶の断片）を `$EDITOR` で開きます。 |

同じ `list` / `delete <id>` / `edit <id>` のサブコマンドは、CLI の会話中で使う `/journey` からも動きます。デスクトップのパネルでは、節点をその場で編集・削除できます。

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

`memory_enabled` と `user_profile_enabled` の **両方** を `false` にすると、組み込みの置き場が完全に止まります。`memory` の道具は定義から外れ、その使い方の説明もシステムプロンプトから外れるので、モデルは使えない道具について何も知らされません。`memory.provider` で設定した外部のプロバイダー（Hindsight、Mem0、Honcho など）はこの影響を受けず、自分の道具を持ったままです。組み込みのファイル *の代わりに* 他社の記憶の仕組みを使いたいときは、こうしてください。`agent.disabled_toolsets` に `memory` を並べるのは、もっと強い切り方です。外部のプロバイダーの道具まで隠します。

`memory_enabled: false` だけにした場合（利用者の人物像は有効なまま）、道具は残ります。人物像の置き場を支えているからです。ただしシステムプロンプトでは、記憶についての説明の全体が、人物像だけの狭い塊に差し替わります。道具の定義は `user` の置き場だけを名乗り、無効になった `MEMORY.md` への直接の書き込みも、控えられた書き込みも拒否されます。逆の設定では `memory` だけを名乗り、`USER.md` への書き込みを拒否します。

## 記憶の書き込みを抑える（`write_approval`） {#controlling-memory-writes-writeapproval}

既定では、エージェントは自由に記憶を残します。ターンのあとに走る、裏方の自己改善の振り返りからの書き込みも含みます。先に承認したいなら、`memory.write_approval: true` にしてください。単純な入切の関門で、**表** のターンにも裏方の振り返りにも同じように効きます。

| `write_approval` | 振る舞い |
|------------------|-----------|
| `false`（既定） | 自由に書く — 関門は開いたまま（関門を入れる前の振る舞い）。 |
| `true` | 何かを残す前に承認を求めます。対話式の CLI では、表のターンの書き込みはその場で尋ねます（項目は全文を読めるくらい小さいので）。それ以外の場所 — メッセージのプラットフォーム、スクリプト、裏方の自己改善の振り返り — では、書き込みは **控え** に回され、`/memory pending` で確認します。 |

> 記憶を関門で抑えるのではなく完全に止めたいなら、`memory_enabled: false` と `user_profile_enabled: false` の両方を設定してください。組み込みの置き場が両方とも無効になると、組み込みの `memory` の道具は自動で隠れます。

控えに回った書き込みは、CLI からでも、どのメッセージのプラットフォームからでも確認できます。

```
/memory pending             # list staged memory writes (auto ones tagged [auto])
/memory approve <id>        # apply one (or 'all')
/memory reject <id>         # drop one (or 'all')
/memory approval on         # turn the gate on (or 'off') and persist it
```

「エージェントが自分について間違った思い込みを保存してしまった」への答えがこれです。`write_approval: true` にすれば、どの保存も — とりわけ頼んでもいない裏方からのものも — あなたの可否を待ってから人物像に入ります。

## 裏方の振り返りの知らせ（`display.memory_notifications`） {#background-review-notifications-displaymemorynotifications}

ターンのあと、裏方の自己改善の振り返りが、そっと記憶を残したりスキルを更新したりすることがあります。これは Hermes の、同意を意識した学びの環です。繰り返された訂正や、長く効く作業の教訓が、短い記憶の項目や手順のスキルになります。一方で `write_approval` を使えば、その書き込みを、以後のセッションに効き始める前に確認へ回せます。既定では、起きたことが分かるように `💾 Memory updated` という短い行が会話に出ます。どのくらい喋るかは調整できます。

```yaml
display:
  memory_notifications: on    # off | on (default) | verbose
```

| 値 | 振る舞い |
|-------|-----------|
| `off` | 会話に知らせを出しません。振り返り自体は走り、書き込みも起きます。ただ、その行が見えないだけです。 |
| `on`（既定） | 一般的な行を出します。たとえば `💾 Memory updated`、`💾 Skill 'foo' patched`。 |
| `verbose` | 何が変わったかの短い抜粋も出します。たとえば `💾 Memory ➕ User prefers terse replies` や、`"old" → "new"` のスキルの差分の断片。 |

> これが決めるのは **ゲートウェイ** の会話の知らせだけです。振り返りそのものと、記憶やスキルの置き場への書き込みは、この設定の影響を受けません。プラットフォームごとに変えるなら `display.platforms.<platform>.memory_notifications` を使います。

## 振り返りを安いモデルで走らせる（`auxiliary.background_review`） {#running-the-review-on-a-cheaper-model-auxiliarybackgroundreview}

振り返りは既定では **会話に使っている主モデル** で走り、会話をたどり直します。会話はすでにプロンプトのキャッシュに温まっているので、安いキャッシュの読み取りで済みます。主モデルが高くつく場合は、振り返りだけを安いモデルで走らせられます。

```yaml
auxiliary:
  background_review:
    provider: openrouter
    model: google/gemini-3-flash-preview   # auto (default) = main chat model
```

主モデルとは **別の** モデルを指すと、振り返りはそちらで、かなり安く走ります（検証では約 3〜5 倍の差）。別のモデルはどのみち主モデルのプロンプトのキャッシュを使えないので、この枝分かれは会話の全文ではなく、短い **要旨**（直近のやり取りはそのまま、古いものは要約）をたどり直します。新しいキャッシュに書き込む量を最小にするためです。拾える中身は保たれます。試したところ、記憶の拾い上げは主モデルでの振り返りと同一で、スキルの拾い上げもほぼ同一でした。

`auto` のままにする（または主モデルを指定する）と何も変わりません。振り返りは主モデルで、温まったキャッシュを丸ごとたどり直したまま走り続けます。

### 自動の振り返りを止める（`enabled`） {#disabling-automatic-reviews-enabled}

振り返りの枝分かれは、忙しいホストではトークン全体のうち無視できない割合を使うことがあります。運用する側は、促しの間隔をゼロにしなくても、これを止められます。

```yaml
auxiliary:
  background_review:
    enabled: true              # false = skip automatic post-turn forks
```

`enabled: false` にすると、ターンのあとの自動の枝分かれは生まれません。手動の `/refine` はそのまま使えます。

枝分かれの使用量は `session_model_usage` に `task='background_review'` として残り、完了の行が `agent.log` に書かれます（`Background review complete: thread=bg-review calls=… in=… out=… result=…`）。

### 絞り込んだ道具を振り返りに足す（`extra_tools`） {#allowing-a-narrowly-scoped-extra-review-tool-extratools}

振り返りの枝分かれは、既定では記憶とスキル管理、それに読み取り専用のファイルの道具を使えます。プロファイルがほかにも、人が見ていない振り返りで使って安全な道具を備えているなら、名前を挙げて使えるようにします。

```yaml
auxiliary:
  background_review:
    extra_tools:
      - propose_shared_memory
```

その道具は、親のエージェントがすでに使える状態でなければなりません。この設定がするのは、振り返りの枝分かれが実行時に使ってよい道具の一覧へ、それを加えることだけです。好きな道具を何でも使えるようにするわけではなく、ここに並んでいない道具は拒まれたままです。一覧は狭く保ち、外部への変更や取り返しのつかない変更をそのまま加える道具よりも、人の確認を待つ形で提案を積んでおく道具を選んでください。既定では空の一覧です。

## スキルの書き込みを抑える（`skills.write_approval`） {#controlling-skill-writes-skillswriteapproval}

スキルも同じ入切の関門を使いますが、確認の仕方は違います。`SKILL.md` は、会話の吹き出しで読むには大きすぎるからです。

```yaml
skills:
  write_approval: false     # false = write freely (default) | true = require approval
```

`write_approval: true` のとき、スキルの書き込み（作成 / 編集 / 修正 / write_file / 削除）は、どこから来たものでも必ず **控え** に回ります。あなたが会話の中で見るのは一行の要旨で、差分の全体は別の場所に置かれます。

```
/skills pending             # list staged skill writes + a one-line gist each
/skills diff <id>           # full unified diff (best viewed in CLI or dashboard)
/skills approve <id>        # apply it (or 'all')
/skills reject <id>         # drop it (or 'all')
/skills approval on         # turn the gate on (or 'off') and persist it
```

メッセージのプラットフォームでは、要旨と付随の情報だけでスキルを承認できます。変更の全体を読みたいときは、CLI かダッシュボードで `/skills diff` を開くか、`~/.hermes/pending/skills/<id>.json` にある控えのファイルを見てください。詳しくは [エージェントのスキルの書き込みを関門で抑える](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval) にあります。

## 外部の記憶プロバイダー {#external-memory-providers}

MEMORY.md と USER.md を超えた、より深くずっと残る記憶のために、Hermes には外部の記憶プロバイダーのプラグインが 8 つ付いてきます。Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover、Supermemory です。

外部のプロバイダーは、組み込みの記憶を置き換えるのではなく **並んで** 動き、知識のグラフ、意味での検索、事実の自動の抽出、セッションをまたいだ利用者の把握といった機能を足します。

```bash
hermes memory setup      # pick a provider and configure it
hermes memory status     # check what's active
```

それぞれのプロバイダーの詳しい説明、設定の手順、比較は [記憶プロバイダー](/hermes/docs/user-guide/features/memory-providers/) のガイドを見てください。
