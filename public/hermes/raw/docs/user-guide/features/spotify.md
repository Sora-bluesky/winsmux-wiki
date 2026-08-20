---
title: "Spotify"
description: ""
upstream_path: user-guide/features/spotify.md
upstream_blob: 1a2b628293a424aa20901461b011a4778841c90f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/spotify
---

# Spotify {#spotify}

Hermes は Spotify を直接操作できます。再生、キュー、検索、プレイリスト、保存済みのトラックやアルバム、再生履歴まで、Spotify 公式の Web API と PKCE OAuth を使って扱えます。トークンは `~/.hermes/auth.json` に保存され、401 が返ったときは自動で更新されます。ログインは端末ごとに一度だけで済みます（リフレッシュトークンは 6 か月ほどで期限切れになるので、そのときは `hermes auth spotify` を実行し直してください）。

Hermes に組み込みの OAuth 連携（Google、GitHub Copilot、Codex）とは違い、Spotify では利用者一人ひとりが自分用の小さな開発者アプリを登録する必要があります。Spotify は、誰でも使える公開 OAuth アプリを第三者が配布することを認めていないためです。作業は 2 分ほどで、`hermes auth spotify` が手順を案内してくれます。

## 事前に必要なもの {#prerequisites}

- Spotify のアカウント。検索、プレイリスト、ライブラリ、履歴のツールは **無料プラン** でも動きます。再生の操作（再生、一時停止、スキップ、シーク、音量、キューへの追加、再生機器の切り替え）には **Premium** が必要です。
- Hermes Agent がインストールされ、動いていること。
- 再生系のツールを使うなら、**動作中の Spotify Connect 機器**。Web API が操作する相手が要るので、スマートフォン、パソコン、Web プレーヤー、スピーカーのどれかで Spotify アプリを開いておきます。何も動いていないと「no active device」というメッセージ付きの `403 Forbidden` が返ります。どれか一台で Spotify を開いてから、もう一度試してください。

## 設定 {#setup}

### 一度で済ませる: `hermes tools` または初回設定 {#one-shot-hermes-tools-or-first-run-setup}

いちばん速い道です。次を実行します。

```bash
hermes tools
```

`🎵 Spotify` までスクロールし、スペースキーでオンに切り替えて、`s` で保存します。同じ切り替えは初回の `hermes setup` / `hermes setup tools` の流れの中にもあります。Spotify は任意で有効にするものなので、そこで有効にしても `hermes tools` と同じ、プロバイダーに合わせた設定が走ります。

Hermes はそのまま OAuth の手順に入ります。Spotify アプリをまだ持っていない場合は、その場で作成手順を案内してくれます。終わったときには、ツール群の有効化と認証の両方が一度に済んでいます。

手順を分けて進めたい場合（あるいは後から認証をやり直す場合）は、次の 2 段階の流れを使ってください。

### 2 段階の流れ {#two-step-flow}

#### 1. ツール群を有効にする {#1-enable-the-toolset}

```bash
hermes tools
```

`🎵 Spotify` をオンにして保存し、その場でウィザードが開いたら Ctrl+C で閉じます。ツール群は有効なままで、認証だけが後回しになります。

#### 2. ログインウィザードを実行する {#2-run-the-login-wizard}

```bash
hermes auth spotify
```

7 つの Spotify ツールは、手順 1 を済ませて初めてエージェントのツール群に現れます。既定ではオフなので、使わない人が API 呼び出しのたびに余分なツール定義を送らずに済みます。

`HERMES_SPOTIFY_CLIENT_ID` が設定されていない場合、Hermes がアプリ登録をその場で案内します。

1. ブラウザーで `https://developer.spotify.com/dashboard` を開きます
2. Spotify の「Create app」フォームに貼り付ける値をそのまま表示します
3. 受け取った Client ID の入力を求めます
4. それを `~/.hermes/.env` に保存し、次回からこの手順を飛ばせるようにします
5. そのまま OAuth の同意画面へ進みます

承認すると、トークンは `~/.hermes/auth.json` の `providers.spotify` の下に書き込まれます。推論プロバイダーの設定は変わりません。Spotify の認証は、使っている LLM プロバイダーとは独立しています。

### Spotify アプリを作る（ウィザードが尋ねる内容） {#creating-the-spotify-app-what-the-wizard-asks-for}

ダッシュボードが開いたら **Create app** をクリックし、次のように入力します。

| 項目 | 値 |
|-------|-------|
| App name | 何でも構いません（例: `hermes-agent`） |
| App description | 何でも構いません（例: `personal Hermes integration`） |
| Website | 空欄のまま |
| Redirect URI | `http://127.0.0.1:43827/spotify/callback` |
| Which API/SDKs? | **Web API** にチェック |

規約に同意して **Save** をクリックします。次のページで **Settings** を開き、**Client ID** をコピーして Hermes の入力欄に貼り付けます。Hermes が必要とする値はこれだけです。PKCE ではクライアントシークレットを使いません。

### SSH 越し・画面のない環境で実行する {#running-over-ssh-in-a-headless-environment}

`SSH_CLIENT` または `SSH_TTY` が設定されている場合、Hermes はウィザードでも OAuth の段階でもブラウザーの自動起動を行いません。Hermes が表示するダッシュボードの URL と認可 URL をコピーして、手元の端末のブラウザーで開けば、あとは同じように進められます。ローカルの HTTP 受け口はリモート側のホストのポート `43827` で動いたままです。手元のブラウザーからリモートのループバックへは、SSH のローカル転送なしには届きません。

```bash
ssh -N -L 43827:127.0.0.1:43827 user@remote-host
```

踏み台やバスティオン経由の構成、その他の落とし穴（mosh、tmux、ポートの衝突）については [OAuth over SSH / Remote Hosts](/hermes/docs/guides/oauth-over-ssh/) を参照してください。

## 確認する {#verify}

```bash
hermes auth status spotify
```

トークンがあるかどうかと、アクセストークンの期限を表示します。更新は自動です。Spotify API の呼び出しが 401 を返すと、クライアントがリフレッシュトークンを交換して一度だけやり直します。リフレッシュトークンは Hermes を再起動しても残るので、Spotify のアカウント設定でアプリの許可を取り消したり、`hermes auth logout spotify` を実行したりしない限り、認証をやり直す必要はありません。

## 使ってみる {#using-it}

ログインすると、エージェントは 7 つの Spotify ツールを使えるようになります。話しかけるのはふだんの言葉で構いません。エージェントが適切なツールと操作を選びます。より良い動きのために、エージェントは定番の使い方（検索は一度にまとめて再生へつなぐ、`get_state` を先回りして呼ばない場面など）を教える補助スキルを読み込みます。

```
> play some miles davis
> what am I listening to
> add this track to my Late Night Jazz playlist
> skip to the next song
> make a new playlist called "Focus 2026" and add the last three songs I played
> which of my saved albums are by Radiohead
> search for acoustic covers of Blackbird
> transfer playback to my kitchen speaker
```

### ツール早見表 {#tool-reference}

再生状態を変えるツールはどれも、機器を指定する `device_id` を任意で受け取ります。省略した場合、Spotify は現在動いている機器を使います。

#### `spotify_playback` {#spotifyplayback}
再生の操作と状態の確認、それに最近の再生履歴の取得を行います。

| 操作 | 用途 | Premium が必要か |
|--------|---------|----------|
| `get_state` | 再生状態の全体（曲、機器、再生位置、シャッフルとリピート） | 不要 |
| `get_currently_playing` | 再生中の曲だけ（204 のときは空を返します。下記参照） | 不要 |
| `play` | 再生の開始や再開。任意で `context_uri`、`uris`、`offset`、`position_ms` | 必要 |
| `pause` | 再生を一時停止 | 必要 |
| `next` / `previous` | 曲を送る・戻す | 必要 |
| `seek` | `position_ms` の位置へ移動 | 必要 |
| `set_repeat` | `state` = `track` / `context` / `off` | 必要 |
| `set_shuffle` | `state` = `true` / `false` | 必要 |
| `set_volume` | `volume_percent` = 0-100 | 必要 |
| `recently_played` | 直近に再生した曲。任意で `limit`、`before`、`after`（Unix ミリ秒） | 不要 |

#### `spotify_devices` {#spotifydevices}
| 操作 | 用途 |
|--------|---------|
| `list` | アカウントから見えるすべての Spotify Connect 機器 |
| `transfer` | 再生を `device_id` へ移す。任意の `play: true` を付けると移した先で再生を始めます |

### Home Assistant が管理するスピーカー {#home-assistant-managed-speakers}

Home Assistant が管理しているスピーカーでも、そのスピーカー自身が Spotify Connect に対応していれば（たとえば Sonos、Echo、Nest など Connect 対応のスピーカー）、Spotify から見えている間は `spotify_devices list` に自動で現れます。この経路では Home Assistant と Spotify をつなぐ橋渡しは要りません。機器の振り分けは Spotify 自身が行います。

Hermes には「キッチンのスピーカーに Spotify を移して」のように、スピーカーの表示名で再生の移動を頼めます。スクリプトから呼ぶときは `spotify_devices list` で確認し、正確な `device_id` を `spotify_devices transfer` に渡してください。目当てのスピーカーが見当たらない場合は、Spotify アプリかそのスピーカーの Spotify 連携を一度開いて、Spotify に動作中の Connect 先として登録させます。

#### `spotify_queue` {#spotifyqueue}
| 操作 | 用途 | Premium が必要か |
|--------|---------|----------|
| `get` | いまキューに入っている曲 | 不要 |
| `add` | `uri` をキューの末尾に追加 | 必要 |

#### `spotify_search` {#spotifysearch}
カタログを検索します。`query` は必須です。任意で `types`（`track` / `album` / `artist` / `playlist` / `show` / `episode` の配列）、`limit`、`offset`、`market` を指定できます。

#### `spotify_playlists` {#spotifyplaylists}
| 操作 | 用途 | 必須の引数 |
|--------|---------|---------------|
| `list` | 自分のプレイリスト | — |
| `get` | プレイリスト 1 件と収録曲 | `playlist_id` |
| `create` | 新しいプレイリスト | `name`（任意で `description`、`public`、`collaborative`） |
| `add_items` | 曲を追加 | `playlist_id`、`uris`（任意で `position`） |
| `remove_items` | 曲を削除 | `playlist_id`、`uris`（任意で `snapshot_id`） |
| `update_details` | 名前の変更や編集 | `playlist_id` と、`name`、`description`、`public`、`collaborative` のいずれか |

#### `spotify_albums` {#spotifyalbums}
| 操作 | 用途 | 必須の引数 |
|--------|---------|---------------|
| `get` | アルバムの情報 | `album_id` |
| `tracks` | アルバムの収録曲 | `album_id` |

#### `spotify_library` {#spotifylibrary}
保存済みの曲とアルバムをまとめて扱います。どちらを対象にするかは `kind` 引数で選びます。

| 操作 | 用途 |
|--------|---------|
| `list` | ライブラリをページ単位で一覧表示 |
| `save` | `ids` / `uris` をライブラリに追加 |
| `remove` | `ids` / `uris` をライブラリから削除 |

必須の引数は `kind` = `tracks` または `albums` と、`action` です。

### できることの対応表: 無料プランと Premium {#feature-matrix-free-vs-premium}

読み取りだけのツールは無料プランでも動きます。再生やキューを変える操作には Premium が要ります。

| 無料プランで動く | Premium が必要 |
|---------------|------------------|
| `spotify_search`（すべて） | `spotify_playback` — play、pause、next、previous、seek、set_repeat、set_shuffle、set_volume |
| `spotify_playback` — get_state、get_currently_playing、recently_played | `spotify_queue` — add |
| `spotify_devices` — list | `spotify_devices` — transfer |
| `spotify_queue` — get | |
| `spotify_playlists`（すべて） | |
| `spotify_albums`（すべて） | |
| `spotify_library`（すべて） | |

## 時刻を決めて動かす: Spotify と cron {#scheduling-spotify-cron}

Spotify のツールはふつうの Hermes のツールなので、Hermes のセッションで動く cron ジョブから好きな時刻に再生を始められます。新しくコードを書く必要はありません。

### 朝の目覚ましプレイリスト {#morning-wake-up-playlist}

```bash
hermes cron add \
  --name "morning-commute" \
  "0 7 * * 1-5" \
  "Transfer playback to my kitchen speaker and start my 'Morning Commute' playlist. Volume to 40. Shuffle on."
```

平日の朝 7 時に起きることは次のとおりです。

1. cron が画面のない Hermes セッションを立ち上げます。
2. エージェントが指示を読み、`spotify_devices list` を呼んで名前から「kitchen speaker」を探し、`spotify_devices transfer` → `spotify_playback set_volume` → `spotify_playback set_shuffle` → `spotify_search` + `spotify_playback play` と続けます。
3. 目当てのスピーカーで音楽が鳴り始めます。かかるのはセッション 1 回と数回のツール呼び出しだけで、人の操作は要りません。

### 夜に静かにしていく {#wind-down-at-night}

```bash
hermes cron add \
  --name "wind-down" \
  "30 22 * * *" \
  "Pause Spotify. Then set volume to 20 so it's quiet when I start it again tomorrow."
```

### 落とし穴 {#gotchas}

- **cron が動く時点で、動作中の機器が要ります。** Spotify のクライアント（スマートフォン、パソコン、Connect 対応スピーカー）がどれも動いていないと、再生系の操作は `403 no active device` を返します。朝のプレイリストなら、スマートフォンではなく常に電源の入っている機器（Sonos、Echo、スマートスピーカー）を狙うのがこつです。
- **再生を変える操作には Premium が要ります。** 再生、一時停止、スキップ、音量、機器の切り替えが該当します。読み取りだけの cron ジョブ（「最近再生した曲をメールで送って」など）は無料プランでも問題なく動きます。
- **cron のエージェントは、有効にしているツール群をそのまま引き継ぎます。** cron のセッションから Spotify のツールを見せるには、`hermes tools` で Spotify を有効にしておく必要があります。
- **cron ジョブは `skip_memory=True` で動きます。** そのため記憶の保存先には書き込みません。

cron の詳しい説明は [Cron Jobs](/hermes/docs/user-guide/features/cron/) にあります。

## ログアウトする {#sign-out}

```bash
hermes auth logout spotify
```

`~/.hermes/auth.json` からトークンを削除します。アプリの設定も消したい場合は、`~/.hermes/.env` から `HERMES_SPOTIFY_CLIENT_ID`（設定していれば `HERMES_SPOTIFY_REDIRECT_URI` も）を削除するか、ウィザードをもう一度実行してください。

Spotify 側でアプリの許可を取り消すには、[Apps connected to your account](https://www.spotify.com/account/apps/) を開いて **REMOVE ACCESS** をクリックします。

## 困ったときは {#troubleshooting}

**`403 Forbidden — Player command failed: No active device found`** — Spotify がどれか一台で動いている必要があります。スマートフォン、パソコン、Web プレーヤーで Spotify アプリを開き、何か 1 曲を数秒だけ再生して機器として登録させてから、もう一度試してください。いま見えている機器は `spotify_devices list` で確認できます。

**`403 Forbidden — Premium required`** — 無料プランのまま、再生を変える操作を使おうとしています。上の対応表を確認してください。

**`get_currently_playing` で `204 No Content`** — どの機器でも何も再生されていない状態です。これは Spotify の正常な応答であってエラーではありません。Hermes は説明を添えた空の結果（`is_playing: false`）として返します。

**`INVALID_CLIENT: Invalid redirect URI`** — Spotify アプリ側の設定にあるリダイレクト URI と、Hermes が使っているものが食い違っています。既定は `http://127.0.0.1:43827/spotify/callback` です。これをアプリの許可済みリダイレクト URI に追加するか、登録した値を `~/.hermes/.env` の `HERMES_SPOTIFY_REDIRECT_URI` に設定してください。

**`429 Too Many Requests`** — Spotify の呼び出し回数の上限です。Hermes は分かりやすいエラーを返すので、1 分ほど待ってからやり直してください。これが続くなら、スクリプトで短い間隔の繰り返しを回している可能性が高いです。Spotify の割り当ては 30 秒ほどで戻ります。

**`401 Unauthorized` が繰り返し出る** — リフレッシュトークンが無効になっています。たいていはアカウントからアプリを外したか、アプリそのものを削除した場合です。`hermes auth spotify` をもう一度実行してください。

**ウィザードがブラウザーを開かない** — SSH 越しの接続や、画面のないコンテナの中では、Hermes がそれを検知して自動起動を行いません。表示されたダッシュボードの URL をコピーして、手作業で開いてください。

## 応用: スコープを自分で指定する {#advanced-custom-scopes}

既定では、Hermes は同梱するすべてのツールに必要なスコープを要求します。権限を絞りたい場合は上書きしてください。

```bash
hermes auth spotify --scope "user-read-playback-state user-modify-playback-state playlist-read-private"
```

スコープの一覧は [Spotify Web API scopes](https://developer.spotify.com/documentation/web-api/concepts/scopes) にあります。ツールが必要とするより少ないスコープしか要求しなかった場合、そのツールの呼び出しは 403 で失敗します。

## 応用: Client ID とリダイレクト URI を自分で指定する {#advanced-custom-client-id-redirect-uri}

```bash
hermes auth spotify --client-id <id> --redirect-uri http://localhost:3000/callback
```

あるいは `~/.hermes/.env` に書いて固定しておくこともできます。

```
HERMES_SPOTIFY_CLIENT_ID=<your_id>
HERMES_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

リダイレクト URI は Spotify アプリの設定で許可しておく必要があります。既定の値でほとんどの場合は足りるので、変えるのはポート 43827 がふさがっているときだけで構いません。

## どこに何があるか {#where-things-live}

| ファイル | 中身 |
|------|----------|
| `~/.hermes/auth.json` → `providers.spotify` | アクセストークン、リフレッシュトークン、期限、スコープ、リダイレクト URI |
| `~/.hermes/.env` | `HERMES_SPOTIFY_CLIENT_ID`、任意で `HERMES_SPOTIFY_REDIRECT_URI` |
| Spotify アプリ | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) にある自分のアプリ。Client ID とリダイレクト URI の許可リストが入っています |
