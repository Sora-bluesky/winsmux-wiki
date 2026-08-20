---
title: "xAI Grok OAuth（SuperGrok / X Premium+）"
description: "SuperGrok または X Premium+ のサブスクリプションでサインインして、Hermes Agent から Grok モデルを使う — API キーは不要"
upstream_path: guides/xai-grok-oauth.md
upstream_blob: 6645229a0c1ebf523850c611aa591a67f786df44
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/xai-grok-oauth
---

# xAI Grok OAuth（SuperGrok / X Premium+） {#xai-grok-oauth-supergrok-x-premium}

Hermes Agent は、[accounts.x.ai](https://accounts.x.ai) に対するブラウザ経由のデバイスコード方式の OAuth ログインで xAI Grok に対応しています。使えるのは **SuperGrok のサブスクリプション**（[grok.com](https://x.ai/grok)）か、**X Premium+ のサブスクリプション**（連携した X アカウント）のどちらかです。`XAI_API_KEY` は要りません。一度ログインすれば、Hermes が裏でセッションを自動的に更新し続けます。

Premium+ に入っている X アカウントでサインインすると、xAI がそのサブスクリプションの状態を自動的に xAI のセッションへ結び付けます。そのため OAuth の流れは、SuperGrok を直接契約している場合とまったく同じになります。

通信部分は `codex_responses` のアダプターを再利用しています（xAI は Responses 形式のエンドポイントを提供しています）。そのため推論、ツール呼び出し、ストリーミング、プロンプトキャッシュは、アダプターに手を入れなくてもそのまま動きます。

同じ OAuth のベアラートークンは、Hermes から xAI へ直接つながるすべての機能でも使い回されます。読み上げ、画像生成、動画生成、文字起こしの 4 つが、1 回のログインでまかなえます。

## 概要 {#overview}

| 項目 | 値 |
|------|-------|
| プロバイダー ID | `xai-oauth` |
| 表示名 | xAI Grok OAuth（SuperGrok / X Premium+） |
| 認証方式 | ブラウザで行う OAuth 2.0 デバイスコード |
| 通信方式 | xAI Responses API（`codex_responses`） |
| 既定のモデル | `grok-4.6` |
| エンドポイント | `https://api.x.ai/v1` |
| 認証サーバー | `https://accounts.x.ai` |
| 必要な環境変数 | なし（このプロバイダーでは `XAI_API_KEY` は**使いません**） |
| サブスクリプション | [SuperGrok](https://x.ai/grok) または [X Premium+](https://x.com/i/premium_sign_up) — 下の注意書きを参照 |

## 事前に必要なもの {#prerequisites}

- Python 3.9 以上
- Hermes Agent が入っていること
- xAI アカウントで有効な **SuperGrok** のサブスクリプション、**または**サインインに使う X アカウントの **X Premium+** サブスクリプション（xAI が自動で結び付けます）
- 表示された確認用 URL を開けるブラウザ（場所はどこでも構いません）

:::warning xAI は階層によって OAuth API の利用を制限することがあります
xAI のバックエンドは OAuth の API 面に独自の許可リストを持っており、アプリ内でサブスクリプションが有効になっていても、通常の SuperGrok 契約者を `HTTP 403` で拒否した例が確認されています（issue [#26847](https://github.com/NousResearch/hermes-agent/issues/26847) を参照）。ブラウザでの OAuth ログインは成功するのに推論が 403 を返す場合は、`XAI_API_KEY` を設定して API キー方式（`provider: xai`）に切り替えてください。今のところ、そちらは同じ制限を受けていません。
:::

## すぐ使い始める {#quick-start}

```bash
# Launch the provider and model picker
hermes model
# → Select "xAI Grok OAuth (SuperGrok / X Premium+)" from the provider list
# → Hermes opens or prints an accounts.x.ai verification URL
# → Enter the displayed code if prompted, then approve access in the browser
# → Pick a model (grok-4.6 is at the top)
# → Start chatting

hermes
```

最初のログイン以降、認証情報は `~/.hermes/auth.json` に保存され、期限が切れる前に自動で更新されます。

## 手動でログインする {#logging-in-manually}

モデルのピッカーを通さずにログインを始めることもできます。

```bash
hermes auth add xai-oauth
```

### リモートやヘッドレスのセッション {#remote-headless-sessions}

サーバー、コンテナ、ブラウザだけのコンソール（Cloud Shell、Codespaces、EC2 Instance Connect）、あるいは SSH のセッションなど、Hermes が手元でブラウザを開けない場面では、Hermes が xAI の確認用 URL とユーザーコードを表示します。手元のノート PC やクラウドのコンソールでその URL を開き、求められたらコードを入力してください。Hermes は xAI がログインを承認するまで問い合わせを続けます。SSH のトンネルもローカルのコールバック待ち受けも必要ありません。

```bash
hermes auth add xai-oauth --no-browser
# Open the printed verification URL in your browser.
```

ウェブのダッシュボードやデスクトップアプリからサインインする場合も、同じデバイスコード方式です。Hermes が確認用 URL とユーザーコードを表示し、承認されるまで裏で問い合わせ続けます。

## ログインのしくみ {#how-the-login-works}

1. Hermes が `auth.x.ai` にデバイスコードを要求します。
2. 確認用 URL を開いてサインインし、求められたら表示されたコードを入力して、アクセスを承認します。
3. Hermes は承認されるまで xAI に問い合わせ、承認後にトークンを `~/.hermes/auth.json` へ保存します。
4. それ以降、Hermes は裏でアクセストークンを更新します。`hermes auth logout xai-oauth` を実行するか、xAI のアカウント設定でアクセスを取り消すまで、ログインしたままになります。

## ログイン状態を確認する {#checking-login-status}

```bash
hermes doctor
```

`◆ Auth Providers` の節に、`xai-oauth` を含むすべてのプロバイダーの現在の状態が表示されます。

## モデルを切り替える {#switching-models}

```bash
hermes model
# → Select "xAI Grok OAuth (SuperGrok / X Premium+)"
# → Pick from the model list (grok-4.6 is pinned to the top)
```

モデルを直接指定することもできます。

```bash
hermes config set model.default grok-4.6
hermes config set model.provider xai-oauth
```

## 設定の早見表 {#configuration-reference}

ログイン後、`~/.hermes/config.yaml` は次のような内容になります。

```yaml
model:
  default: grok-4.6
  provider: xai-oauth
  base_url: https://api.x.ai/v1
```

### プロバイダーの別名 {#provider-aliases}

次のものはすべて `xai-oauth` として扱われます。

```bash
hermes --provider xai-oauth        # canonical
hermes --provider grok-oauth       # alias
hermes --provider x-ai-oauth       # alias
hermes --provider xai-grok-oauth   # alias
```

## xAI へ直接つながるツール（読み上げ / 画像 / 動画 / 文字起こし / X 検索） {#direct-to-xai-tools-tts-image-video-transcription-x-search}

OAuth でログインしていれば、xAI へ直接つながるツールはすべて同じベアラートークンを自動で使い回します。API キーを使いたい場合を除き、**別の設定は要りません**。

各ツールで使うものを選ぶにはこうします。

```bash
hermes tools
# → Text-to-Speech       → "xAI TTS"
# → Image Generation     → "xAI Grok Imagine (image)"
# → Video Generation     → "xAI Grok Imagine"
# → X (Twitter) Search   → "xAI Grok OAuth (SuperGrok / X Premium+)"
```

OAuth のトークンがすでに保存されていれば、ピッカーがそれを確認して認証情報の入力を飛ばします。OAuth も `XAI_API_KEY` もない場合は、OAuth でログインする・API キーを貼る・飛ばす、の 3 択が出ます。

:::note 動画生成は既定でオフです
`video_gen` のツール群は既定で無効です。エージェントが `video_generate` を呼べるようにするには、`hermes tools` → `🎬 Video Generation` でスペースキーを押して有効にしてください。そうしないと、エージェントが同じく動画生成に分類されている同梱の ComfyUI スキルへ流れてしまうことがあります。
:::

:::note xAI の認証情報があると X 検索は自動で有効になります
`x_search` のツール群は、xAI の認証情報（SuperGrok / X Premium+ の OAuth トークンまたは `XAI_API_KEY`）が設定されていると自動で有効になります。これを望まない場合は、`hermes tools` → `🐦 X (Twitter) Search` でスペースキーを押して明示的に無効にしてください。このツールは xAI に組み込みの `x_search` Responses API を通ります。SuperGrok / X Premium+ の OAuth ログインでも、有料の `XAI_API_KEY` でも**どちらでも**使え、両方が設定されている場合は OAuth を優先します（API の従量課金ではなくサブスクリプションの枠を使うためです）。xAI の認証情報が何も設定されていない場合は、ツール群が有効かどうかにかかわらず、ツールの定義自体がモデルから隠されます。
:::

### モデル {#models}

| ツール | モデル | 備考 |
|------|-------|-------|
| チャット | `grok-4.6` | 既定。OAuth のピッカーで先頭に固定されます |
| チャット | `grok-build-0.1` | コーディング向けの Grok Build モデル |
| チャット | `grok-4.3` | 前の世代 |
| チャット | `grok-4.20-0309-reasoning` | 推論あり版 |
| チャット | `grok-4.20-0309-non-reasoning` | 推論なし版 |
| チャット | `grok-4.20-multi-agent-0309` | マルチエージェント版 |
| 画像 | `grok-imagine-image` | 既定。およそ 5〜10 秒 |
| 画像 | `grok-imagine-image-2.0` | 文字組みやレイアウトに強い。品質は最も高い。およそ 10〜20 秒 |
| 画像 | `grok-imagine-image-quality` | より忠実。およそ 10〜20 秒 |
| 動画 | `grok-imagine-video` | テキストから動画 |
| 動画 | `grok-imagine-video-1.5-preview` | 画像から動画。日付入りの別名は `grok-imagine-video-1.5-2026-05-30` |
| 読み上げ | （既定の声） | xAI の `/v1/tts` エンドポイント |

チャット用のモデル一覧は、ディスク上の `models.dev` キャッシュから随時作られます。xAI の新しいモデルは、このキャッシュが更新されれば自動的に現れます。`grok-4.6` は常に一覧の先頭に固定されます。

## 環境変数 {#environment-variables}

| 変数 | 効果 |
|----------|--------|
| `XAI_BASE_URL` | 既定の `https://api.x.ai/v1` エンドポイントを上書きします（必要になることはめったにありません）。 |

xAI を使うプロバイダーにするには、`config.yaml` に `model.provider: xai-oauth` を設定するか（案内に沿って進めたい場合は `hermes setup` を使います）、1 回かぎりの実行なら `--provider xai-oauth` を付けてください。

## うまくいかないとき {#troubleshooting}

### トークンが切れたのに自動で再ログインしない {#token-expired-not-re-logging-in-automatically}

Hermes はセッションのたびにトークンを更新し、401 が返ったときにもその場で更新します。更新が `invalid_grant` で失敗した場合（更新トークンが取り消された、アカウントが入れ替わった、など）は、Hermes はクラッシュせずに再認証を促すメッセージを出します。

更新の失敗が回復不能なとき（HTTP 4xx、`invalid_grant`、許可の取り消しなど）、Hermes はその更新トークンを無効とみなして手元で隔離します。以降の呼び出しは、見込みのない更新の試行を飛ばすので、同じ 401 を何度も繰り返すことはありません。エージェントは「再認証が必要です」というメッセージを一度だけ出し、再びログインするまで邪魔をしません。

**対処:** `hermes auth add xai-oauth` をもう一度実行して、新しくログインし直してください。隔離は次にトークンの取得が成功した時点で解除されます。

### 承認がタイムアウトした {#authorization-timed-out}

デバイスコードの承認には期限があります（xAI がデバイスコードの応答に `expires_in` を設定しており、たいていは数十分ほどです）。時間内に承認しないと、Hermes はタイムアウトのエラーを出します。

**対処:** `hermes auth add xai-oauth`（または `hermes model`）を実行し直してください。手順は最初からやり直しになります。

### リモートのサーバーからログインする {#logging-in-from-a-remote-server}

SSH やコンテナのセッションでは、Hermes はブラウザを開かずに確認用 URL とユーザーコードを表示します。その URL を手元のノート PC やクラウドのコンソールのブラウザで開いてください。xAI Grok OAuth では SSH のポート転送は要りません。

```bash
hermes auth add xai-oauth --no-browser
```

ループバックへ戻ってくる方式のプロバイダー（Spotify や MCP サーバー）については、[SSH / リモートホスト越しの OAuth](/hermes/docs/guides/oauth-over-ssh/) を参照してください。

### ログインは成功したのに HTTP 403 になる（階層・利用資格） {#http-403-after-a-successful-login-tier-entitlement}

ブラウザでの OAuth は完了してトークンも保存されているのに、推論やトークンの更新が *「The caller does not have permission to execute the specified operation」* のようなメッセージとともに `HTTP 403` を返す状態です。

これはトークンが古いことによる問題では**ありません**。`hermes model` をやり直しても変わりません。xAI のバックエンドが、アプリ内でサブスクリプションが有効でも、OAuth API の利用を特定の SuperGrok の階層に絞っていた例が確認されています（issue [#26847](https://github.com/NousResearch/hermes-agent/issues/26847)）。

**対処:** `XAI_API_KEY` を設定して、API キー方式に切り替えてください。

```bash
export XAI_API_KEY=xai-...
hermes config set model.provider xai
```

どうしても OAuth の経路が必要な場合は、[x.ai/grok](https://x.ai/grok) でサブスクリプションを上位に切り替えてください。

### 実行時に「No xAI credentials found」というエラーが出る {#no-xai-credentials-found-error-at-runtime}

認証情報の保存先に `xai-oauth` の項目がなく、`XAI_API_KEY` も設定されていない状態です。まだログインしていないか、認証情報のファイルが消えています。

**対処:** `hermes model` を実行して xAI Grok OAuth のプロバイダーを選ぶか、`hermes auth add xai-oauth` を実行してください。

## ログアウトする {#logging-out}

保存されている xAI Grok OAuth の認証情報をすべて消すにはこうします。

```bash
hermes auth logout xai-oauth
```

これで `auth.json` の単一の OAuth 項目と、`xai-oauth` の認証情報プールの行の両方が消えます。プールの項目を 1 つだけ消したい場合は `hermes auth remove xai-oauth <index|id|label>` を使ってください（`hermes auth list xai-oauth` で一覧を確認できます）。

## あわせて読む {#see-also}

- [SSH / リモートホスト越しの OAuth](/hermes/docs/guides/oauth-over-ssh/) — ループバックへ戻る方式のプロバイダー（Spotify、MCP）向けの SSH トンネル。xAI はデバイスコード方式なのでトンネルは不要です
- [AI プロバイダー一覧](/hermes/docs/integrations/providers/)
- [環境変数](/hermes/docs/reference/environment-variables/)
- [設定](/hermes/docs/user-guide/configuration/)
- [音声と読み上げ](/hermes/docs/user-guide/features/tts/)
