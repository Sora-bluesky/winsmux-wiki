---
title: "MiniMax OAuth"
description: "ブラウザ経由の OAuth で MiniMax にログインし、Hermes Agent で MiniMax-M2.7 系のモデルを使う方法です。API キーは要りません"
upstream_path: guides/minimax-oauth.md
upstream_blob: 0c0770252a73182e3bbd24c773744735a98ed6d8
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/minimax-oauth
---

# MiniMax OAuth {#minimax-oauth}

Hermes Agent は **MiniMax** を、ブラウザを使った OAuth ログインで利用できます。認証情報は [MiniMax のポータル](https://www.minimax.io) と同じものです。API キーもクレジットカードも不要で、一度ログインすれば Hermes がセッションを自動で更新します。

通信には `anthropic_messages` アダプターをそのまま使います（MiniMax は `/anthropic` に Anthropic Messages 互換のエンドポイントを公開しています）。そのため、既存のツール呼び出し、ストリーミング、コンテキスト関連の機能は、アダプターに手を入れなくてもすべて動きます。

## 概要 {#overview}

| 項目 | 値 |
|------|-------|
| プロバイダー ID | `minimax-oauth` |
| 表示名 | MiniMax (OAuth) |
| 認証方式 | ブラウザ OAuth（PKCE リダイレクト方式） |
| 通信方式 | Anthropic Messages 互換（`anthropic_messages`） |
| モデル | `MiniMax-M2.7`、`MiniMax-M2.7-highspeed` |
| グローバル向けエンドポイント | `https://api.minimax.io/anthropic` |
| 中国向けエンドポイント | `https://api.minimaxi.com/anthropic` |
| 環境変数の要否 | 不要（このプロバイダーで `MINIMAX_API_KEY` は**使いません**） |

## 事前に必要なもの {#prerequisites}

- Python 3.9 以上
- Hermes Agent がインストールされていること
- [minimax.io](https://www.minimax.io)（グローバル）または [minimaxi.com](https://www.minimaxi.com)（中国）の MiniMax アカウント
- 手元の端末で使えるブラウザ（リモート接続の場合は `--no-browser` を使います）

## クイックスタート {#quick-start}

```bash
# Launch the provider and model picker
hermes model
# → Select "MiniMax (OAuth)" from the provider list
# → Hermes opens your browser to the MiniMax authorization page
# → Approve access in the browser
# → Select a model (MiniMax-M2.7 or MiniMax-M2.7-highspeed)
# → Start chatting

hermes
```

最初のログインが済むと、認証情報は `~/.hermes/auth.json` に保存され、セッションを始めるたびに自動で更新されます。

## 自分でログインを実行する {#logging-in-manually}

モデルの選択画面を経由せずに、ログインだけを実行することもできます。

```bash
hermes auth add minimax-oauth
```

### 中国リージョン {#china-region}

アカウントが中国向けのプラットフォーム（`minimaxi.com`）にある場合は、API キー方式の `minimax-cn` プロバイダーを使ってください。`minimax-cn` は `auth_type="api_key"` のみで登録されており、OAuth の流れはありません。`MINIMAX_CN_API_KEY`（必要に応じて `MINIMAX_CN_BASE_URL` も）を直接設定します。

```bash
echo 'MINIMAX_CN_API_KEY=your-key' >> ~/.hermes/.env
```

### リモート／画面のない環境 {#remote-headless-sessions}

ブラウザが使えないサーバーやコンテナでは、次のようにします。

```bash
hermes auth add minimax-oauth --no-browser
```

Hermes が確認用の URL とユーザーコードを表示します。手元のどの端末でもよいので URL を開き、求められたらコードを入力してください。

## OAuth の流れ {#the-oauth-flow}

Hermes は MiniMax の OAuth エンドポイントに対して、PKCE を使ったブラウザ OAuth の流れを実装しています。

1. Hermes が PKCE のベリファイアーとチャレンジの組、そしてランダムな state の値を生成します。
2. チャレンジを添えて `{base_url}/oauth/code` に POST し、`user_code` と `verification_uri` を受け取ります。
3. ブラウザが `verification_uri` を開きます。入力を求められたら `user_code` を入れてください。
4. Hermes は `{base_url}/oauth/token` を繰り返し呼び、トークンが返るまで（あるいは期限切れまで）待ちます。
5. トークン（`access_token`、`refresh_token`、有効期限）が `~/.hermes/auth.json` の `minimax-oauth` の項目に保存されます。

トークンの更新（標準的な OAuth の `refresh_token` グラント）は、アクセストークンの有効期限まで 60 秒を切っていれば、セッションを始めるたびに自動で走ります。

## ログイン状態を確認する {#checking-login-status}

```bash
hermes doctor
```

`◆ Auth Providers` の欄に、次のように表示されます。

```
✓ MiniMax OAuth  (logged in, region=global)
```

ログインしていない場合は、次のようになります。

```
⚠ MiniMax OAuth  (not logged in)
```

## モデルを切り替える {#switching-models}

```bash
hermes model
# → Select "MiniMax (OAuth)"
# → Pick from the model list
```

モデルを直接指定することもできます。

```bash
hermes config set model.default MiniMax-M2.7
hermes config set model.provider minimax-oauth
```

## 設定の早見表 {#configuration-reference}

ログインが済むと、`~/.hermes/config.yaml` には次のような内容が入ります。

```yaml
model:
  default: MiniMax-M2.7
  provider: minimax-oauth
  base_url: https://api.minimax.io/anthropic
```

### リージョンごとのエンドポイント {#region-endpoints}

| プロバイダー ID | ポータル | 推論のエンドポイント |
|-------------|--------|-------------------|
| `minimax-oauth`（グローバル） | `https://api.minimax.io` | `https://api.minimax.io/anthropic` |
| `minimax-cn`（中国） | `https://api.minimaxi.com` | `https://api.minimaxi.com/anthropic` |

### プロバイダーの別名 {#provider-aliases}

次はいずれも `minimax-oauth` として扱われます。

```bash
hermes --provider minimax-oauth    # canonical
hermes --provider minimax-portal   # alias
hermes --provider minimax-global   # alias
hermes --provider minimax_oauth    # alias (underscore form)
```

## 環境変数 {#environment-variables}

`minimax-oauth` プロバイダーは `MINIMAX_API_KEY` や `MINIMAX_BASE_URL` を**使いません**。これらは API キー方式の `minimax` と `minimax-cn` のためのものです。

| 変数 | 効果 |
|----------|--------|
| `MINIMAX_API_KEY` | `minimax` プロバイダー専用。`minimax-oauth` では無視されます |
| `MINIMAX_CN_API_KEY` | `minimax-cn` プロバイダー専用。`minimax-oauth` では無視されます |

`minimax-oauth` を使うプロバイダーにするには、`config.yaml` で `model.provider: minimax-oauth` を設定するか（対話的に進めるなら `hermes setup` を使います）、その回かぎりで `--provider minimax-oauth` を渡します。

```bash
hermes --provider minimax-oauth
```

## モデル {#models}

| モデル | 向いている用途 |
|-------|----------|
| `MiniMax-M2.7` | 長いコンテキストを使う推論、複雑なツール呼び出し |
| `MiniMax-M2.7-highspeed` | 応答を速くしたいとき、軽い作業、補助的な呼び出し |

どちらのモデルも最大 200,000 トークンのコンテキストに対応します。

`minimax-oauth` を主に使うプロバイダーにしている場合、画像の処理や作業の委譲といった補助的な用途にも `MiniMax-M2.7` が自動で使われます。

## 困ったときは {#troubleshooting}

### トークンが切れたのに再ログインが自動で走らない {#token-expired-not-re-logging-in-automatically}

Hermes は、有効期限まで 60 秒を切っていればセッションを始めるたびにトークンを更新します。すでにアクセストークンが切れている場合（長くオフラインだったときなど）は、次のリクエストのタイミングで自動的に更新されます。更新が `refresh_token_reused` や `invalid_grant` で失敗した場合、Hermes はそのセッションを再ログインが必要な状態として扱います。

更新の失敗が回復不能なとき（HTTP 4xx、`invalid_grant`、認可の取り消しなど）、Hermes はそのリフレッシュトークンを無効と判断して手元で隔離し、通らないやりとりを繰り返さないようにします。エージェントは「再認証が必要」という案内を一度だけ出し、あらためてログインするまで余計な口出しをしません。

**対処:** もう一度 `hermes auth add minimax-oauth` を実行して、ログインをやり直してください。隔離は、次に成功したやりとりで解除されます。

### 認可が時間切れになった {#authorization-timed-out}

デバイスコード方式には有効期限があります。時間内に承認しないと、Hermes はタイムアウトのエラーを出します。

**対処:** `hermes auth add minimax-oauth`（または `hermes model`）をあらためて実行してください。最初からやり直しになります。

### state が一致しない（CSRF の可能性） {#state-mismatch-possible-csrf}

認可サーバーが返した `state` の値が、Hermes が送ったものと一致しませんでした。

**対処:** ログインをやり直してください。それでも続く場合は、OAuth の応答を書き換えているプロキシやリダイレクトがないか確認します。

### リモートのサーバーからログインする {#logging-in-from-a-remote-server}

`hermes` がブラウザのウィンドウを開けない場合は `--no-browser` を使ってください。

```bash
hermes auth add minimax-oauth --no-browser
```

Hermes が URL とコードを表示します。手元のどの端末でもよいので URL を開き、そちらで手続きを終えてください。

### 実行中に「Not logged into MiniMax OAuth」と出る {#not-logged-into-minimax-oauth-error-at-runtime}

認証情報の保存先に `minimax-oauth` の情報がありません。まだログインしていないか、認証情報のファイルが削除されています。

**対処:** `hermes model` を実行して MiniMax (OAuth) を選ぶか、`hermes auth add minimax-oauth` を実行してください。

## ログアウトする {#logging-out}

保存済みの MiniMax OAuth の認証情報を削除するには、次を実行します。

```bash
hermes auth logout minimax-oauth
```

## 関連ページ {#see-also}

- [AI プロバイダー一覧](/hermes/docs/integrations/providers/)
- [環境変数](/hermes/docs/reference/environment-variables/)
- [設定](/hermes/docs/user-guide/configuration/)
- [hermes doctor](/hermes/docs/reference/cli-commands/)
