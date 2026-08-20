---
title: "Xurl — xurl CLI で X/Twitter を扱う: 投稿の生データ検索、投稿、DM、メディア"
description: "xurl CLI で X/Twitter を扱う: 投稿の生データ検索、投稿、DM、メディア"
upstream_path: user-guide/skills/bundled/social-media/social-media-xurl.md
upstream_blob: c88091157f48c3238374db6d1fefaa047c66d783
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/social-media/social-media-xurl
---

# Xurl {#xurl}

xurl CLI で X/Twitter を扱います。投稿の生データ検索、投稿、DM、メディアに対応します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/social-media/xurl` |
| バージョン | `1.1.3` |
| 作者 | xdevplatform + openclaw + Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `twitter`, `x`, `social-media`, `xurl`, `official-api` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# xurl — 公式 CLI から X (Twitter) API を使う {#xurl-x-twitter-api-via-the-official-cli}

`xurl` は、X developer platform が公式に提供している X API 用の CLI です。よく使う操作のショートカットコマンドに加えて、v2 のどのエンドポイントにも curl のように直接アクセスできます。どのコマンドも結果を JSON で標準出力に返します。

この skill は、次のような用途に使います。
- 投稿・返信・引用・削除
- 投稿の生データ検索（実際の投稿 JSON が ID つきで返るので、そのまま反応できます）と、タイムライン・メンションの閲覧
- いいね・リポスト・ブックマーク
- フォロー・フォロー解除・ブロック・ミュート
- ダイレクトメッセージ
- メディアのアップロード（画像と動画）
- X API v2 のどのエンドポイントへの直接アクセス
- 複数アプリ・複数アカウントでの運用

この skill は、以前の `xitter` skill（サードパーティ製の Python CLI をラップしたもの）を置き換えます。`xurl` は X developer platform チームが保守しており、OAuth 2.0 PKCE の自動更新に対応し、対応する API の範囲もかなり広くなっています。

---

## シークレットの取り扱い（必須） {#secret-safety-mandatory}

エージェントや LLM のセッションの中で操作するときに、絶対に守るべきルールです。

- `~/.xurl` を LLM のコンテキストに読み込む・表示する・解析する・要約する・アップロードする・送信することは**決してしない**でください。
- 認証情報やトークンをチャットに貼り付けるよう利用者に求めることも**決してしない**でください。
- `~/.xurl` へのシークレットの記入は、利用者が自分の端末で手作業で行います。Docker の場合は、Hermes のツール用サブプロセスから見える `~` である必要があります。後述の Docker に関する注意を参照してください。
- シークレットを直接引数に書く認証コマンドを、エージェントのセッションで勧めたり実行したりすることも**決してしない**でください。
- エージェントのセッションで `--verbose` / `-v` を使うことも**決してしない**でください。認証ヘッダーやトークンが表示されてしまう可能性があります。
- 認証情報の有無を確認したいときは、`xurl auth status` だけを使ってください。

エージェントのコマンドで使ってはいけないフラグ（シークレットを直接受け取るため）:
`--bearer-token`, `--consumer-key`, `--consumer-secret`, `--access-token`, `--token-secret`, `--client-id`, `--client-secret`

アプリの認証情報の登録と、認証情報の入れ替えは、エージェントのセッションの外で利用者が手作業で行う必要があります。認証情報を登録したあと、利用者は `xurl auth oauth2` で認証します。これもエージェントのセッションの外です。トークンは YAML 形式で `~/.xurl` に保存されます。アプリごとにトークンは分かれています。OAuth 2.0 のトークンは自動で更新されます。

---

## 導入 {#installation}

どれか1つの方法を選んでください。Linux ではシェルスクリプトか `go install` が一番簡単です。

```bash
# Shell script (installs to ~/.local/bin, no sudo, works on Linux + macOS)
curl -fsSL https://raw.githubusercontent.com/xdevplatform/xurl/main/install.sh | bash

# Homebrew (macOS)
brew install --cask xdevplatform/tap/xurl

# npm
npm install -g @xdevplatform/xurl

# Go
go install github.com/xdevplatform/xurl@latest
```

確認します。

```bash
xurl --help
xurl auth status
```

`xurl` は入っているのに `auth status` にアプリもトークンも表示されない場合は、利用者が手作業で認証を済ませる必要があります。次の節を参照してください。

---

## 最初に一度だけ行う設定（エージェントの外で利用者が実行します） {#one-time-user-setup-user-runs-these-outside-the-agent}

ここでの手順はシークレットの貼り付けを伴うため、エージェントではなく利用者が直接行う必要があります。この節を利用者に案内してください。代わりに実行してはいけません。

1. https://developer.x.com/en/portal/dashboard でアプリを作成するか、既存のアプリを開きます
2. リダイレクト URI を `http://localhost:8080/callback` に設定します
3. アプリの Client ID と Client Secret をコピーします
4. アプリを手元に登録します（利用者が実行します）:
   ```bash
   xurl auth apps add my-app --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
   ```
5. 認証します（`--app` を指定して、トークンをそのアプリに結びつけます）:
   ```bash
   xurl auth oauth2 --app my-app
   ```
   （ブラウザが開き、OAuth 2.0 PKCE の流れが始まります。）

   OAuth のあとの `/2/users/me` の照会で X が `UsernameNotFound` エラーや 403 を返す場合は、自分のハンドルを明示的に渡してください（xurl v1.1.0 以降）:
   ```bash
   xurl auth oauth2 --app my-app YOUR_USERNAME
   ```
   これでトークンがハンドルに結びつき、うまく動かない `/2/users/me` の呼び出しを飛ばせます。
6. すべてのコマンドがそのアプリを使うよう、既定に設定します:
   ```bash
   xurl auth default my-app
   ```
7. 確認します:
   ```bash
   xurl auth status
   xurl whoami
   ```

ここまで済めば、エージェントは以下のどのコマンドも追加の設定なしで使えます。OAuth 2.0 のトークンは自動で更新されます。

> **よくある落とし穴:** `xurl auth oauth2` で `--app my-app` を省くと、OAuth トークンは組み込みの `default` アプリのプロフィールに保存されます。ここには client-id も client-secret もありません。OAuth の流れが成功したように見えても、コマンドは認証エラーで失敗します。この状態になったら、`xurl auth oauth2 --app my-app` と `xurl auth default my-app` をやり直してください。

> **Docker の HOME に関する落とし穴:** 公式の Hermes Docker 構成では `/opt/data` が `HERMES_HOME` ですが、Hermes のツール用サブプロセスは `/opt/data/home` を `HOME` として使います。つまり Hermes が実行する `xurl` コマンドにとって、`~/.xurl` は `/opt/data/.xurl` ではなく `/opt/data/home/.xurl` を指します。利用者の設定も同じ HOME で実行してください:
> ```bash
> HOME=/opt/data/home xurl auth apps add my-app --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
> HOME=/opt/data/home xurl auth oauth2 --app my-app YOUR_USERNAME
> HOME=/opt/data/home xurl auth default my-app YOUR_USERNAME
> HOME=/opt/data/home xurl auth status
> ```
> `HOME=/opt/data xurl auth status` が成功しても、`HOME=/opt/data/home xurl auth status` でアプリもトークンも表示されないなら、Hermes のツール呼び出しからは認証情報が見えていません。

---

## 早見表 {#quick-reference}

| 操作 | コマンド |
| --- | --- |
| 投稿する | `xurl post "Hello world!"` |
| 返信する | `xurl reply POST_ID "Nice post!"` |
| 引用する | `xurl quote POST_ID "My take"` |
| 投稿を削除する | `xurl delete POST_ID` |
| 投稿を読む | `xurl read POST_ID` |
| 投稿を検索する | `xurl search "QUERY" -n 10` |
| 自分は誰か | `xurl whoami` |
| ユーザーを調べる | `xurl user @handle` |
| ホームタイムライン | `xurl timeline -n 20` |
| メンション | `xurl mentions -n 10` |
| いいね / 取り消し | `xurl like POST_ID` / `xurl unlike POST_ID` |
| リポスト / 取り消し | `xurl repost POST_ID` / `xurl unrepost POST_ID` |
| ブックマーク / 解除 | `xurl bookmark POST_ID` / `xurl unbookmark POST_ID` |
| ブックマーク / いいねの一覧 | `xurl bookmarks -n 10` / `xurl likes -n 10` |
| フォロー / フォロー解除 | `xurl follow @handle` / `xurl unfollow @handle` |
| フォロー中 / フォロワー | `xurl following -n 20` / `xurl followers -n 20` |
| ブロック / 解除 | `xurl block @handle` / `xurl unblock @handle` |
| ミュート / 解除 | `xurl mute @handle` / `xurl unmute @handle` |
| DM を送る | `xurl dm @handle "message"` |
| DM の一覧 | `xurl dms -n 10` |
| メディアをアップロードする | `xurl media upload path/to/file.mp4` |
| メディアの状態 | `xurl media status MEDIA_ID` |
| アプリの一覧 | `xurl auth apps list` |
| アプリを削除する | `xurl auth apps remove NAME` |
| 既定のアプリを設定する | `xurl auth default APP_NAME [USERNAME]` |
| このリクエストだけ別のアプリ | `xurl --app NAME /2/users/me` |
| 認証の状態 | `xurl auth status` |

補足:
- `POST_ID` には完全な URL も使えます（例: `https://x.com/user/status/1234567890`）。xurl が ID を取り出します。
- ユーザー名は先頭の `@` があってもなくても動きます。

---

## コマンドの詳細 {#command-details}

### 投稿する {#posting}

```bash
xurl post "Hello world!"
xurl post "Check this out" --media-id MEDIA_ID
xurl post "Thread pics" --media-id 111 --media-id 222

xurl reply 1234567890 "Great point!"
xurl reply https://x.com/user/status/1234567890 "Agreed!"
xurl reply 1234567890 "Look at this" --media-id MEDIA_ID

xurl quote 1234567890 "Adding my thoughts"
xurl delete 1234567890
```

### 読む・検索する {#reading-search}

`xurl search` は、認証済みのアカウントとして X の索引を検索し、投稿オブジェクトをそのまま返します。ID・投稿者・本文全文が入っているので、結果に対してすぐ反応できます（返信・いいね・リポスト・引用）。話題についてまとめた答えではなく、実際の投稿そのものが必要なときに使ってください。

```bash
xurl read 1234567890
xurl read https://x.com/user/status/1234567890

xurl search "golang"
xurl search "from:elonmusk" -n 20
xurl search "#buildinpublic lang:en" -n 15
```

X の記事（X Articles）には、`read` のショートカットではなく API を直接叩くモードを使います。`xurl read`
が受け取るのは投稿 ID か投稿 URL です。`/2/tweets/...` の
エンドポイントの前に `read` を置かないでください。`article` の tweet field を要求して、JSON レスポンスの `data.article.plain_text`
を読み取ります。

```bash
xurl --app APP_NAME '/2/tweets/2057909493250539891?expansions=author_id,attachments.media_keys,referenced_tweets.id&tweet.fields=created_at,lang,public_metrics,context_annotations,entities,possibly_sensitive,conversation_id,in_reply_to_user_id,referenced_tweets,article'
```

### ユーザー・タイムライン・メンション {#users-timeline-mentions}

```bash
xurl whoami
xurl user elonmusk
xurl user @XDevelopers

xurl timeline -n 25
xurl mentions -n 20
```

### 反応する {#engagement}

```bash
xurl like 1234567890
xurl unlike 1234567890

xurl repost 1234567890
xurl unrepost 1234567890

xurl bookmark 1234567890
xurl unbookmark 1234567890

xurl bookmarks -n 20
xurl likes -n 20
```

### フォロー関係 {#social-graph}

```bash
xurl follow @XDevelopers
xurl unfollow @XDevelopers

xurl following -n 50
xurl followers -n 50

# Another user's graph
xurl following --of elonmusk -n 20
xurl followers --of elonmusk -n 20

xurl block @spammer
xurl unblock @spammer
xurl mute @annoying
xurl unmute @annoying
```

### ダイレクトメッセージ {#direct-messages}

```bash
xurl dm @someuser "Hey, saw your post!"
xurl dms -n 25
```

### メディアのアップロード {#media-upload}

```bash
# Auto-detect type
xurl media upload photo.jpg
xurl media upload video.mp4

# Explicit type/category
xurl media upload --media-type image/jpeg --category tweet_image photo.jpg

# Videos need server-side processing — check status (or poll)
xurl media status MEDIA_ID
xurl media status --wait MEDIA_ID

# Full workflow
xurl media upload meme.png                  # returns media id
xurl post "lol" --media-id MEDIA_ID
```

---

## API を直接叩く {#raw-api-access}

ショートカットでよくある操作はまかなえます。それ以外は、X API v2 のどのエンドポイントに対しても curl のような直接モードで呼び出せます。

```bash
# GET
xurl /2/users/me

# POST with JSON body
xurl -X POST /2/tweets -d '{"text":"Hello world!"}'

# DELETE / PUT / PATCH
xurl -X DELETE /2/tweets/1234567890

# Custom headers
xurl -H "Content-Type: application/json" /2/some/endpoint

# Force streaming
xurl -s /2/tweets/search/stream

# Full URLs also work
xurl https://api.x.com/2/users/me
```

---

## 全体で使えるフラグ {#global-flags}

| フラグ | 短縮形 | 説明 |
| --- | --- | --- |
| `--app` | | 登録済みの特定のアプリを使う（既定より優先されます） |
| `--auth` | | 認証方式を指定する: `oauth1`, `oauth2`, `app` |
| `--username` | `-u` | どの OAuth2 アカウントを使うか（複数ある場合） |
| `--verbose` | `-v` | **エージェントのセッションでは禁止** — 認証ヘッダーが漏れます |
| `--trace` | `-t` | `X-B3-Flags: 1` のトレースヘッダーを付ける |

---

## ストリーミング {#streaming}

ストリーミングのエンドポイントは自動で判別されます。分かっているものは次のとおりです。

- `/2/tweets/search/stream`
- `/2/tweets/sample/stream`
- `/2/tweets/sample10/stream`

どのエンドポイントでも `-s` を付ければストリーミングを強制できます。

---

## 出力の形式 {#output-format}

どのコマンドも JSON を標準出力に返します。構造は X API v2 に沿っています。

```json
{ "data": { "id": "1234567890", "text": "Hello world!" } }
```

エラーも JSON です。

```json
{ "errors": [ { "message": "Not authorized", "code": 403 } ] }
```

---

## よくある使い方 {#common-workflows}

### 画像つきで投稿する {#post-with-an-image}
```bash
xurl media upload photo.jpg
xurl post "Check out this photo!" --media-id MEDIA_ID
```

### 会話に返信する {#reply-to-a-conversation}
```bash
xurl read https://x.com/user/status/1234567890
xurl reply 1234567890 "Here are my thoughts..."
```

### 検索して反応する {#search-and-engage}
```bash
xurl search "topic of interest" -n 10
xurl like POST_ID_FROM_RESULTS
xurl reply POST_ID_FROM_RESULTS "Great point!"
```

### 自分の状況を確認する {#check-your-activity}
```bash
xurl whoami
xurl mentions -n 20
xurl timeline -n 20
```

### 複数のアプリを使う（認証情報は手作業で設定済み） {#multiple-apps-credentials-pre-configured-manually}
```bash
xurl auth default prod alice               # prod app, alice user
xurl --app staging /2/users/me             # one-off against staging
```

---

## エラーの扱い {#error-handling}

- エラーが起きると、終了コードは 0 以外になります。
- API のエラーも JSON で標準出力に表示されるので、解析できます。
- 認証エラーが出たら、エージェントのセッションの外で `xurl auth oauth2` をやり直してもらってください。
- 呼び出し側のユーザー ID が必要なコマンド（いいね、リポスト、ブックマーク、フォローなど）は、`/2/users/me` で自動的に取得します。そこで認証に失敗すると、認証エラーとして表面化します。

---

## エージェントの進め方 {#agent-workflow}

1. 事前条件を確認します。`xurl --help` と `xurl auth status` です。
2. `xurl search` を使う前に、意図を確認します。実際の投稿オブジェクトが必要なとき、認証済みアカウントの文脈が要るとき、あるいは X への書き込み操作につながるときに使ってください。話題の要約ではなく、反応できる投稿そのものを求めているときに向いた手段です。
3. **既定のアプリに認証情報があるか確認します。** `auth status` の出力を読み取ってください。既定のアプリには `▸` が付いています。既定のアプリが `oauth2: (none)` なのに別のアプリに有効な oauth2 ユーザーがある場合は、`xurl auth default <that-app>` を実行するよう利用者に伝えてください。これがいちばん多い設定ミスです。利用者が独自の名前でアプリを追加したものの既定に設定しておらず、xurl が空の `default` プロフィールを使い続けている状態です。
4. 認証がまったくない場合は、そこで止めて「最初に一度だけ行う設定」の節を利用者に案内してください。自分でアプリを登録したりシークレットを渡したりしては**いけません**。
5. まずは負荷の軽い読み取り（`xurl whoami`、`xurl user @handle`、`xurl search ... -n 3`）で、つながっているか確かめます。
6. 書き込み操作（投稿、返信、いいね、リポスト、DM、フォロー、ブロック、削除）の前には、対象の投稿・ユーザーと利用者の意図を確認します。
7. X の状態を変える操作が実際に行われたことを示せるのは、`xurl` コマンドの出力（または X API の生のレスポンス）だけです。検索結果・要約・それまでの文脈など、ほかの情報をもとに書き込みが完了したと報告しては決していけません。
8. JSON の出力はそのまま使ってください。どのレスポンスも最初から構造化されています。
9. `~/.xurl` の中身を会話に貼り戻しては決していけません。

---

## 困ったとき {#troubleshooting}

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| OAuth の流れが成功したのに認証エラーになる | 自分の名前付きアプリではなく `default` アプリ（client-id / secret なし）にトークンが保存されている | `xurl auth oauth2 --app my-app` のあとに `xurl auth default my-app` |
| OAuth 中に `unauthorized_client` | X のダッシュボードでアプリ種別が "Native App" になっている | User Authentication Settings で "Web app, automated app or bot" に変更する |
| OAuth 直後の `/2/users/me` で `UsernameNotFound` または 403 | X が `/2/users/me` からユーザー名を安定して返さない | `xurl auth oauth2 --app my-app YOUR_USERNAME` をやり直し（xurl v1.1.0 以降）、ハンドルを明示的に渡す |
| すべてのリクエストが 401 | トークンの期限切れ、または既定のアプリが違う | `xurl auth status` を確認し、`▸` が oauth2 トークンを持つアプリを指しているか見る |
| `client-forbidden` / `client-not-enrolled` | X プラットフォーム側の登録の問題 | ダッシュボード → Apps → Manage → "Pay-per-use" パッケージへ移動 → Production 環境 |
| `CreditsDepleted` | X API の残高が $0 | Developer Console → Billing でクレジットを購入（最低 $5） |
| 画像のアップロードで `media processing failed` | 既定のカテゴリが `amplify_video` になっている | `--category tweet_image --media-type image/png` を足す |
| X のダッシュボードに "Client Secret" が2つ表示される | UI の不具合。1つ目は実は Client ID | "Keys and tokens" のページで確認する。ID は `MTpjaQ` で終わります |

---

## 補足 {#notes}

- **レート制限:** X はエンドポイントごとにレート制限をかけています。429 が返ったら、待ってからやり直してください。書き込み系（投稿、返信、いいね、リポスト）は読み取りより制限が厳しめです。
- **スコープ:** OAuth 2.0 のトークンは広いスコープを使います。特定の操作だけ 403 になる場合は、たいていトークンにそのスコープがありません。利用者に `xurl auth oauth2` をやり直してもらってください。
- **トークンの更新:** OAuth 2.0 のトークンは自動で更新されます。することはありません。
- **複数のアプリ:** アプリごとに認証情報とトークンが分かれています。`xurl auth default` か `--app` で切り替えます。
- **1つのアプリに複数アカウント:** `-u / --username` で選ぶか、`xurl auth default APP USER` で既定を決めます。
- **トークンの保存先:** `~/.xurl` は YAML です。Docker では、Hermes のサブプロセスの HOME（公式イメージでは `/opt/data/home`）に合わせて、トークンが `/opt/data/home/.xurl` に置かれるようにしてください。このファイルを読んだり LLM のコンテキストに送ったりしては決していけません。
- **費用:** X API は、実用的な使い方をするなら基本的に有料です。失敗の多くはコードの問題ではなく、プランや権限の問題です。

---

## 出典 {#attribution}

- 元の CLI: https://github.com/xdevplatform/xurl (X developer platform team, Chris Park et al.)
- 元のエージェント skill: https://github.com/openclaw/openclaw/blob/main/skills/xurl/SKILL.md
- Hermes 向けの調整: Hermes の skill の書き方に合わせて整形しました。安全のための注意書きはそのまま残しています。
