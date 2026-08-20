---
title: "X（Twitter）の検索"
description: "xAI に組み込まれた x_search という Responses の道具を使って、エージェントの中から X（Twitter）の投稿やスレッドを検索する。SuperGrok のログインでも XAI_API_KEY でも動く"
upstream_path: user-guide/features/x-search.md
upstream_blob: ec06adde31ee7bb92e6c0d05d53f14f1da5be0d7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/x-search
---

# X（Twitter）の検索 {#x-twitter-search}

`x_search` という道具を使うと、エージェントが X（Twitter）の投稿・プロフィール・スレッドを直に検索できます。中身は `https://api.x.ai/v1/responses` にある Responses API の、xAI に組み込まれた `x_search` です。実際に検索するのは Grok 自身で、元の投稿への出典を添えた、まとめの答えが返ってきます。

**X 上での**いまの話題、反応、主張が知りたいときは、`web_search` ではなくこちらを使ってください。ウェブ一般のページには、これまでどおり `web_search`／`web_extract` を使います。

## `x_search` と `xurl` の違い {#xsearch-vs-xurl}

Hermes は、X に対して2つの窓口を用意できます。

| 窓口 | 向いていること | 向いていないこと |
|---------|------------|-------------------|
| `x_search` | 読むだけの、公開された X の探索。いまの話題、反応、主張、プロフィール、スレッド、出典付きのまとめの答え。 | 投稿、返信、いいね、DM、メディアの送信、削除、ログイン済みの X アカウントの状態が変わったことの確認。 |
| `xurl` のスキル | 厳密な、あるいはログインを伴う X の API の操作。`post`、`reply`、`read`、`like`、`dm`、タイムライン、メンション、メディアの送信、アカウント固有の読み取り、v2 の生の窓口。 | `x_search` が使えて、ログイン済みのアカウントの文脈もいらない場面での、Grok がまとめる幅広い公開 X の調べもの。 |

両方を混ぜて進めるときは、まず `x_search` で候補になる公開の投稿を見つけ、対象の投稿・利用者・操作がはっきりしてから `xurl read` などの厳密な `xurl` のコマンドに切り替えてください。X の状態を変える操作は、必ず `xurl` の出力か X の API の応答で確かめます。`x_search` の答えは、書き込みが行われた証拠には決してなりません。

:::tip
Portal で xAI のモデルにすでに支払っているなら、Live Search の呼び出しはチャットに設定したのと同じ xAI の鍵に請求されます。[Nous Portal](/hermes/docs/integrations/nous-portal/) を見てください。
:::

## 認証 {#authentication}

`x_search` は、xAI の資格情報が**どちらか**あれば登録されます。

| 資格情報 | 入手元 | 準備 |
|------------|--------|-------|
| **SuperGrok／X Premium+ の OAuth** | `accounts.x.ai` でのブラウザからのログイン。自動で更新されます | `hermes auth add xai-oauth` — [xAI Grok の OAuth（SuperGrok／X Premium+）](/hermes/docs/guides/xai-grok-oauth/)を参照 |
| **`XAI_API_KEY`**（こちらが優先されます） | 有料の xAI の API の鍵 | `~/.hermes/.env` に設定します |

どちらも同じ窓口に同じ中身を送ります。違うのは認証に使うトークンだけです。**両方を設定している場合は、明示的な `XAI_API_KEY` が勝ちます** — 契約に紐づく OAuth のトークンでも `/v1/responses` は使えますが、x_search には出典のない、Grok が説明するだけの弱い形で答えが返ってきます。API の鍵なら実際の投稿が返ります。つまり鍵を設定していると、x_search は従量課金の API を使うことになります。契約の枠内で使いたければ `XAI_API_KEY` を外してください（そのぶん、答えが弱くなる点は先ほどのとおりです）。

この道具の `check_fn` は、モデルに渡す道具の一覧が組み直されるたびに、xAI の資格情報の解決を走らせます。`True` が返るのは、トークンが取得できて、中身が空でなく、期限切れだった場合は更新にも成功したときです。取り消されたトークンで更新にも失敗すると、この道具は一覧から隠れます。モデルからは、そもそも見えなくなります。

## 道具を有効にする {#enabling-the-tool}

xAI の資格情報（OAuth のトークンか `XAI_API_KEY`）があれば自動で有効になります。使いたくない場合は `hermes tools` → Search → x_search で明示的に切ってください。

```bash
hermes tools
# → 🐦 X (Twitter) Search   (press space to toggle on)
```

選択画面では、資格情報の選び方が2つ出ます。

1. **xAI Grok OAuth (SuperGrok / Premium+)** — まだログインしていなければ、ブラウザで `accounts.x.ai` が開きます
2. **xAI API key** — `XAI_API_KEY` の入力を求められます

どちらでも条件は満たせます。すでに持っているほうを選んでかまいません。この道具の働きはどちらでも同じです。両方を設定した場合、呼び出しのときは OAuth が優先されます。

## 設定 {#configuration}

```yaml
# ~/.hermes/config.yaml
x_search:
  # xAI model used for the Responses call.
  # grok-4.5 is the recommended default; any Grok model
  # with x_search tool access works.
  model: grok-4.5

  # Optional reasoning effort: low, medium, high, or xhigh. When omitted,
  # the selected model's default applies. xhigh is supported only by
  # models that document it, such as grok-4.20-multi-agent.
  # reasoning_effort: low

  # Request timeout in seconds. x_search can take 60–120s for
  # complex queries — the default is generous. Minimum: 30.
  timeout_seconds: 180

  # Number of automatic retries on 5xx / ReadTimeout / ConnectionError.
  # Each retry backs off (1.5x attempt seconds, capped at 5s).
  retries: 2
```

`reasoning_effort` は、xAI の Responses API へ
`reasoning: {effort: ...}` として送られます。推論の度合いを設定できないモデルでは、指定しないままにしてください。値が正しくない場合は、API に要求を出す前に失敗します。

## 道具に渡せる項目 {#tool-parameters}

エージェントは、次の引数を付けて `x_search` を呼びます。

| 項目 | 型 | 説明 |
|-----------|------|-------------|
| `query` | 文字列（必須） | X で何を調べるか。 |
| `allowed_x_handles` | 文字列の配列 | この利用者名**だけ**を対象にする、任意の一覧（最大10件）。先頭の `@` は取り除かれます。 |
| `excluded_x_handles` | 文字列の配列 | 除きたい利用者名の、任意の一覧（最大10件）。`allowed_x_handles` とは同時に使えません。 |
| `from_date` | 文字列 | 任意。`YYYY-MM-DD` 形式の開始日。 |
| `to_date` | 文字列 | 任意。`YYYY-MM-DD` 形式の終了日。 |
| `enable_image_understanding` | 真偽値 | 見つかった投稿に付いている画像の解析を xAI に依頼します。 |
| `enable_video_understanding` | 真偽値 | 見つかった投稿に付いている動画の解析を xAI に依頼します。 |

この道具は、次の内容を含む JSON を返します。

- `answer` — Grok がまとめた答えの文章
- `citations` — Responses API の最上位の項目として返ってきた出典
- `inline_citations` — 本文から取り出した `url_citation` の注記（それぞれ `url`、`title`、`start_index`、`end_index` を持ちます）
- `degraded` — 絞り込みの条件（`allowed_x_handles`、`excluded_x_handles`、`from_date`、`to_date`）を設定したうえで、2つの出典の経路がどちらも空で返ってきたときに `true` になります。この場合の `answer` は X の索引ではなくモデル自身の知識から作られているので、出典のないものとして扱ってください。それ以外は `false` です（絞り込みを設定していない場合も含みます。出典のない幅広い答えは、ただの答えであって、絞り込みの空振りではありません）
- `degraded_reason` — どの絞り込みが効いていたかを示す短い文字列。`degraded` が `false` のときは `null` です
- `credential_source` — OAuth で解決したなら `"xai-oauth"`、API の鍵で解決したなら `"xai"`
- `model`、`query`、`provider`、`tool`、`success`

### 日付の検査 {#date-validation}

`from_date` と `to_date` は、HTTP の要求を出す前に手元で検査されます。

- どちらも、指定するなら `YYYY-MM-DD` として読めなければなりません。
- 両方を設定した場合、`from_date` は `to_date` と同じ日かそれより前でなければなりません。
- `from_date` は、UTC での今日より後にできません。まだ始まっていない期間に投稿が存在するはずはなく、出典が必ず0件になる呼び出しだからです。
- `to_date` が未来なのは認められます（届いた順に投稿を拾うため、「昨日から明日まで」と指定したい場面はあります）。

検査に通らなかったときは、xAI への HTTP の呼び出しではなく、`{"error": "..."}` という形の結果として返ります。

## 使い方の例 {#example}

エージェントへの語りかけです。

> What are people on X saying about the new Grok image features? Focus on responses from @xai.

エージェントは、次のように動きます。

1. `query="reactions to new Grok image features"`、`allowed_x_handles=["xai"]` を付けて `x_search` を呼びます
2. まとめの答えと、個々の投稿へつながる出典の一覧を受け取ります
3. 答えと参照先を返します

次に「いちばんいいものに返信して」「その投稿にいいねして」と頼まれた場合、エージェントは `xurl` のスキルに切り替え、対象の投稿を正確に確かめたうえで X の API の操作を使うべきです。`x_search` は、あくまで見つけるための道具です。

## 困ったときは {#troubleshooting}

### 「No xAI credentials available」と出る {#no-xai-credentials-available}

認証の2つの経路がどちらも通らないときに出ます。`~/.hermes/.env` に `XAI_API_KEY` を設定するか、`hermes auth add xai-oauth` を実行してブラウザでのログインを済ませてください。そのあと、エージェントが道具の一覧を読み直せるよう、セッションを開き直します。

### 「`x_search` is not enabled for this model」と出る {#xsearch-is-not-enabled-for-this-model}

設定した `x_search.model` に、サーバー側の `x_search` を使う権限がありません。`grok-4.5`（既定）か、対応している別の Grok のモデルに変えてください。いま対応しているモデルは [xAI の文書](https://docs.x.ai/)で確認できます。

### 道具が一覧に出てこない {#tool-doesnt-appear-in-the-schema}

考えられる原因は2つです。

1. **道具の組が有効になっていない。** `hermes tools` を実行し、`🐦 X (Twitter) Search` に印が付いているか確かめてください。
2. **xAI の資格情報がない。** check_fn が False を返すため、一覧に出ないままになります。`hermes auth status` で xai-oauth のログイン状態を確かめ、（API の鍵を使うなら）`XAI_API_KEY` が設定されているかを見てください。

### `degraded: true` — 出典のない答えが返る {#degraded-true-answer-with-no-citations}

`allowed_x_handles`、`excluded_x_handles`、あるいは期間の指定を使ったうえで `degraded: true` が返ってきたときは、xAI 側の X の索引に合う投稿がなかったのに、Grok が自分の学習した内容からまとめの答えを作った、ということです。この答えには出典がありません。本当の X の結果として扱わないでください。

確かめる価値のある原因です。

- **利用者名の打ち間違い。** `@` を外し、綴りを見直して、そのアカウントが存在するか確かめます。
- **期間が狭すぎる**、または今日の投稿から外れている。範囲を広げてやり直してください。
- **xAI 側の索引の抜け。** よく投稿しているアカウントでも、`x_search` にたまたま出てこないことがあります。数分おいてやり直すか、特定の利用者のタイムラインを正確に読みたいときは `xurl` のスキルで X の API を直に読んでください。

## あわせて読む {#see-also}

- [xAI Grok の OAuth（SuperGrok／Premium+）](/hermes/docs/guides/xai-grok-oauth/) — OAuth の準備の手引き
- [xurl のスキル](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/) — ログインを伴うアカウントの操作のための、公式の X の API のコマンド
- [Web 検索と本文の取り出し](/hermes/docs/user-guide/features/web-search/) — X 以外の、ウェブ一般の検索
- [ツール一覧](/hermes/docs/reference/tools-reference/) — 道具の全一覧
