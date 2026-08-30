---
title: "Xurl — xurl CLI で X/Twitter を扱う: 投稿の生データ検索、投稿、DM、メディア"
description: "xurl CLI で X/Twitter を扱う: 投稿の生データ検索、投稿、DM、メディア"
upstream_path: user-guide/skills/bundled/social-media/social-media-xurl.md
upstream_blob: 7e42b4f9e76a2e2ddde946e3c23a779dce151e3e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/social-media/social-media-xurl
---

# Xurl {#xurl}

xurl CLI で X/Twitter を扱います。投稿の生データ検索、投稿、DM、メディアに対応します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/social-media\xurl` |
| バージョン | `1.1.3` |
| 作者 | xdevplatform + openclaw + Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `twitter`, `x`, `social-media`, `xurl`, `official-api` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# xurl — 公式 CLI から X（Twitter）API を使う {#xurl-x-twitter-api-via-the-official-cli}

`xurl` は、X の開発者プラットフォームが公式に提供する X API 用の CLI です。よく使う操作のショートカットコマンドに加えて、v2 のどのエンドポイントにも curl のように直接アクセスできます。どのコマンドも結果を JSON で標準出力に返します。

この skill が向いているのは、次のような場面です。

- 投稿する、返信する、引用する、削除する
- 投稿を生データのまま検索する（実際に投稿の JSON が返るので、その ID を使ってそのまま反応できます）、タイムラインやメンションを読む
- いいね、リポスト、ブックマーク
- フォロー、フォロー解除、ブロック、ミュート
- ダイレクトメッセージ
- メディアのアップロード（画像と動画）
- X API v2 のどのエンドポイントにも直接アクセスする
- 複数のアプリ / 複数アカウントを使い分ける

この skill は、以前の `xitter` skill（第三者製の Python CLI をラップしたもの）を置き換えるものです。`xurl` は X の開発者プラットフォームチームが保守していて、OAuth 2.0 PKCE と自動更新に対応し、扱える API の範囲もかなり広くなっています。

---

## 秘密情報の扱い（必読） {#secret-safety-mandatory}

エージェント / LLM のセッションの中で動かすときに、必ず守ってほしい決まりです。

- `~/.xurl` を LLM のコンテキストに読み込ませない、表示しない、解析しない、要約しない、アップロードしない、送らない。ひとつも **してはいけません**。
- 認証情報やトークンをチャットに貼るよう利用者に求めては **いけません**。
- `~/.xurl` への秘密情報の記入は、利用者が自分の端末で手作業で行います。Docker では、Hermes のツールの子プロセスから見える `~` である必要があります。後述の Docker に関する注意を参照してください。
- 秘密情報をコマンドラインに直接書く認証コマンドを、エージェントのセッションで勧めたり実行したりしては **いけません**。
- エージェントのセッションで `--verbose` / `-v` を使っては **いけません**。認証ヘッダーやトークンが表に出ることがあります。
- 認証情報があるかどうかの確認には `xurl auth status` だけを使ってください。

エージェントのコマンドで使ってはいけないフラグ（秘密情報を直接書けてしまうため）:
`--bearer-token`, `--consumer-key`, `--consumer-secret`, `--access-token`, `--token-secret`, `--client-id`, `--client-secret`

アプリの認証情報の登録と入れ替えは、エージェントのセッションの外で、利用者が手作業で行います。登録が済んだら、利用者が `xurl auth oauth2` で認証します。これもエージェントのセッションの外で行います。トークンは YAML 形式で `~/.xurl` に保存されます。アプリごとにトークンは分かれます。OAuth 2.0 のトークンは自動で更新されます。

---

## 導入 {#installation}

いずれか 1 つの方法を選びます。Linux では、シェルスクリプトか `go install` が手軽です。

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

`xurl` は入っているのに `auth status` にアプリもトークンも出ない場合は、利用者が手作業で認証を済ませる必要があります。次の節を参照してください。

---

## 利用者が最初に一度だけ行う設定（エージェントの外で実行します） {#one-time-user-setup-user-runs-these-outside-the-agent}

ここは秘密情報の貼り付けを伴うため、エージェントではなく利用者が直接行います。エージェントはこの節を案内するだけにして、代わりに実行しないでください。

1. https://developer.x.com/en/portal/dashboard でアプリを作る、または開きます
2. リダイレクト URI を `http://localhost:8080/callback` にします
3. アプリの Client ID と Client Secret を控えます
4. アプリをローカルに登録します（利用者が実行します）:
   ```bash
   xurl auth apps add my-app --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
   ```
5. 認証します（`--app` を指定して、トークンをそのアプリに結び付けます）:
   ```bash
   xurl auth oauth2 --app my-app
   ```
   （ブラウザが開いて OAuth 2.0 PKCE の流れが始まります。）

   OAuth 後の `/2/users/me` の参照で X が `UsernameNotFound` や 403 を返す場合は、自分のハンドルを明示的に渡します（xurl v1.1.0 以降）:
   ```bash
   xurl auth oauth2 --app my-app YOUR_USERNAME
   ```
   こうするとトークンがハンドルに結び付き、うまく動かない `/2/users/me` の呼び出しを飛ばせます。
6. すべてのコマンドがそのアプリを使うよう、既定に設定します:
   ```bash
   xurl auth default my-app
   ```
7. 確認します:
   ```bash
   xurl auth status
   xurl whoami
   ```

ここまで済めば、エージェントは以下のコマンドを追加の設定なしで使えます。OAuth 2.0 のトークンは自動で更新されます。

> **よくあるつまずき:** `xurl auth oauth2` で `--app my-app` を省くと、OAuth のトークンが組み込みの `default` アプリのプロファイルに保存されます。このプロファイルには client-id も client-secret もありません。OAuth の画面上はうまくいったように見えても、コマンドは認証エラーで失敗します。これに当たったら `xurl auth oauth2 --app my-app` と `xurl auth default my-app` をやり直してください。

> **Docker の HOME に関するつまずき:** 公式の Hermes の Docker 構成では `/opt/data` が `HERMES_HOME` ですが、Hermes のツールの子プロセスは `/opt/data/home` を `HOME` として使います。つまり Hermes が実行する `xurl` にとって `~/.xurl` は `/opt/data/.xurl` ではなく `/opt/data/home/.xurl` を指します。利用者の設定も同じ HOME で実行してください:
> ```bash
> HOME=/opt/data/home xurl auth apps add my-app --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
> HOME=/opt/data/home xurl auth oauth2 --app my-app YOUR_USERNAME
> HOME=/opt/data/home xurl auth default my-app YOUR_USERNAME
> HOME=/opt/data/home xurl auth status
> ```
> `HOME=/opt/data xurl auth status` は通るのに `HOME=/opt/data/home xurl auth status` でアプリもトークンも出ない場合、Hermes のツール呼び出しからは認証情報が見えていません。

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
| 自分を確認する | `xurl whoami` |
| ユーザーを調べる | `xurl user @handle` |
| ホームのタイムライン | `xurl timeline -n 20` |
| メンション | `xurl mentions -n 10` |
| いいね / 取り消し | `xurl like POST_ID` / `xurl unlike POST_ID` |
| リポスト / 取り消し | `xurl repost POST_ID` / `xurl unrepost POST_ID` |
| ブックマーク / 解除 | `xurl bookmark POST_ID` / `xurl unbookmark POST_ID` |
| ブックマーク / いいねの一覧 | `xurl bookmarks -n 10` / `xurl likes -n 10` |
| フォロー / 解除 | `xurl follow @handle` / `xurl unfollow @handle` |
| フォロー中 / フォロワー | `xurl following -n 20` / `xurl followers -n 20` |
| ブロック / 解除 | `xurl block @handle` / `xurl unblock @handle` |
| ミュート / 解除 | `xurl mute @handle` / `xurl unmute @handle` |
| DM を送る | `xurl dm @handle "message"` |
| DM の一覧 | `xurl dms -n 10` |
| メディアをアップロードする | `xurl media upload path/to/file.mp4` |
| メディアの処理状況 | `xurl media status MEDIA_ID` |
| アプリの一覧 | `xurl auth apps list` |
| アプリを削除する | `xurl auth apps remove NAME` |
| 既定のアプリを設定する | `xurl auth default APP_NAME [USERNAME]` |
| このリクエストだけアプリを指定する | `xurl --app NAME /2/users/me` |
| 認証の状態 | `xurl auth status` |

補足:
- `POST_ID` には URL 全体も渡せます（例: `https://x.com/user/status/1234567890`）。xurl が ID を取り出します。
- ユーザー名は先頭に `@` を付けても付けなくても動きます。

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

`xurl search` は、認証したアカウントとして X の索引を検索し、投稿オブジェクトをそのまま返します。ID、投稿者、本文が揃うので、返信・いいね・リポスト・引用にすぐつなげられます。話題についての要約ではなく実際の投稿が必要なときに使ってください。

```bash
xurl read 1234567890
xurl read https://x.com/user/status/1234567890

xurl search "golang"
xurl search "from:elonmusk" -n 20
xurl search "#buildinpublic lang:en" -n 15
```

X Articles を読むときは、`read` のショートカットではなく生の API モードを使います。`xurl read`
は投稿 ID か投稿 URL を受け取るものなので、`/2/tweets/...` の
エンドポイントの前に `read` を置かないでください。`article` のツイートフィールドを要求し、JSON レスポンスの `data.article.plain_text`
を読み取ります。

```bash
xurl --app APP_NAME '/2/tweets/2057909493250539891?expansions=author_id,attachments.media_keys,referenced_tweets.id&tweet.fields=created_at,lang,public_metrics,context_annotations,entities,possibly_sensitive,conversation_id,in_reply_to_user_id,referenced_tweets,article'
```

### ユーザー、タイムライン、メンション {#users-timeline-mentions}

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

### つながりを扱う {#social-graph}

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

## API に直接アクセスする {#raw-api-access}

ショートカットでよくある操作はまかなえます。それ以外は、X API v2 のどのエンドポイントに対しても curl のように直接アクセスできます。

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

## 共通のフラグ {#global-flags}

| フラグ | 短縮形 | 説明 |
| --- | --- | --- |
| `--app` | | 登録済みのアプリを指定して使います（既定より優先されます） |
| `--auth` | | 認証方式を固定します: `oauth1`、`oauth2`、`app` |
| `--username` | `-u` | 使う OAuth2 アカウントを選びます（複数ある場合） |
| `--verbose` | `-v` | **エージェントのセッションでは使用禁止** — 認証ヘッダーが漏れます |
| `--trace` | `-t` | `X-B3-Flags: 1` のトレースヘッダーを付けます |

---

## ストリーミング {#streaming}

ストリーミングのエンドポイントは自動で判別されます。分かっているものは次のとおりです。

- `/2/tweets/search/stream`
- `/2/tweets/sample/stream`
- `/2/tweets/sample10/stream`

`-s` を付ければ、どのエンドポイントでもストリーミングにできます。

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

## よくある流れ {#common-workflows}

### 画像を付けて投稿する {#post-with-an-image}
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

### 自分の動きを確認する {#check-your-activity}
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

## エラーへの対応 {#error-handling}

- エラーが起きると終了コードは 0 以外になります。
- API のエラーも JSON で標準出力に出るので、そのまま解析できます。
- 認証エラーのときは、エージェントのセッションの外で利用者に `xurl auth oauth2` をやり直してもらいます。
- 呼び出し元のユーザー ID が必要なコマンド（いいね、リポスト、ブックマーク、フォローなど）は `/2/users/me` で自動的に取得します。ここで認証に失敗すると、認証エラーとして表に出ます。

---

## エージェントの進め方 {#agent-workflow}

1. 前提を確認します。`xurl --help` と `xurl auth status` です。
2. `xurl search` を使う前に、目的を確かめます。実際の投稿オブジェクトが必要なとき、認証したアカウントの文脈が要るとき、あるいはそのまま X への書き込み操作につなげたいときに向いています。話題の要約ではなく、反応できる投稿がほしい場面がこれに当たります。
3. **既定のアプリに認証情報があるかを確認します。** `auth status` の出力を読みます。既定のアプリには `▸` が付いています。既定のアプリが `oauth2: (none)` なのに別のアプリに有効な oauth2 ユーザーがある場合は、`xurl auth default <that-app>` を実行するよう利用者に伝えます。これがいちばん多い設定ミスです。独自の名前でアプリを追加したものの既定に設定しておらず、xurl が空の `default` プロファイルを使い続けている状態です。
4. 認証がまったく無い場合は、そこで止めて「利用者が最初に一度だけ行う設定」の節を案内します。エージェントがアプリを登録したり秘密情報を渡したりしては **いけません**。
5. まずは負荷の軽い読み取り（`xurl whoami`、`xurl user @handle`、`xurl search ... -n 3`）で、つながることを確かめます。
6. 書き込み操作（投稿、返信、いいね、リポスト、DM、フォロー、ブロック、削除）の前に、対象の投稿やユーザーと利用者の意図を確認します。
7. X の状態を変える操作が実際に行われた証拠になるのは、`xurl` コマンドの出力（または X API の生のレスポンス）だけです。検索結果、要約、前の文脈といった他の材料をもとに、書き込みが済んだと報告してはいけません。
8. JSON の出力をそのまま使ってください。どのレスポンスもすでに構造化されています。
9. `~/.xurl` の中身を会話に貼り戻さないでください。

---

## 困ったとき {#troubleshooting}

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| OAuth はうまくいったのに認証エラーになる | トークンが、名前を付けたアプリではなく `default` アプリ（client-id / secret が無い）に保存されている | `xurl auth oauth2 --app my-app` のあと `xurl auth default my-app` |
| OAuth 中に `unauthorized_client` が出る | X のダッシュボードでアプリ種別が「Native App」になっている | User Authentication Settings で「Web app, automated app or bot」に変更します |
| OAuth 直後に `/2/users/me` で `UsernameNotFound` か 403 が出る | X が `/2/users/me` からユーザー名を安定して返さない | ハンドルを明示的に渡すため `xurl auth oauth2 --app my-app YOUR_USERNAME` をやり直します（xurl v1.1.0 以降） |
| すべてのリクエストが 401 になる | トークンの期限切れ、または既定のアプリが違う | `xurl auth status` を確認し、`▸` が oauth2 トークンを持つアプリを指しているか見ます |
| `client-forbidden` / `client-not-enrolled` | X 側の登録状態の問題 | ダッシュボード → Apps → Manage → 「Pay-per-use」パッケージへ移行 → Production 環境 |
| `CreditsDepleted` | X API の残高が 0 | Developer Console → Billing でクレジットを購入します（最低 5 ドル） |
| 画像のアップロードで `media processing failed` | 既定のカテゴリが `amplify_video` になっている | `--category tweet_image --media-type image/png` を足します |
| X のダッシュボードに「Client Secret」が 2 つ表示される | 画面側の不具合で、1 つ目は実は Client ID | 「Keys and tokens」のページで確認します。ID は `MTpjaQ` で終わります |

---

## 補足 {#notes}

- **レート制限:** X はエンドポイントごとにレート制限をかけています。429 が返ったら、待ってからやり直します。書き込み系（投稿、返信、いいね、リポスト）は読み取りより制限が厳しめです。
- **スコープ:** OAuth 2.0 のトークンは広めのスコープを持ちます。特定の操作だけ 403 になる場合は、たいていトークンにそのスコープが無いということです。利用者に `xurl auth oauth2` をやり直してもらいます。
- **トークンの更新:** OAuth 2.0 のトークンは自動で更新されます。することはありません。
- **複数のアプリ:** アプリごとに認証情報とトークンが分かれます。`xurl auth default` か `--app` で切り替えます。
- **1 つのアプリで複数のアカウント:** `-u / --username` で選ぶか、`xurl auth default APP USER` で既定を決めます。
- **トークンの保存場所:** `~/.xurl` は YAML です。Docker では、Hermes の子プロセスの HOME（公式イメージでは `/opt/data/home`）を使い、トークンが `/opt/data/home/.xurl` に置かれるようにします。このファイルを読んだり LLM のコンテキストに送ったりしないでください。
- **費用:** X API は、実用的に使うなら基本的に有料です。失敗の多くはコードではなく、プランや権限の問題です。

---

## 出典 {#attribution}

- 元になった CLI: https://github.com/xdevplatform/xurl （X 開発者プラットフォームチーム、Chris Park ほか）
- 元になったエージェント skill: https://github.com/openclaw/openclaw/blob/main/skills/xurl/SKILL.md
- Hermes 向けの調整: Hermes の skill の書式に合わせて整えました。安全のための注意書きはそのまま残しています。
