---
title: "無料枠とサインイン"
description: "キーを追加したりサインインしたりする前に Hermes で使えるもの、無料枠と自分の API キーの併用、サインインの方法、無料枠を切る方法を説明します。"
upstream_path: user-guide/free-tier.md
upstream_blob: c03e502406b34d7e0a09fa2c9915aa4eb6494f99
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/free-tier
---

# 無料枠とサインイン {#free-tier-and-signing-in}

:::note まだ有効になっていません
無料枠は順次提供中です。全員に有効になるまでは、プロセスの環境に `HERMES_GUEST_ONBOARDING=1` を付けて起動しない限り、このページに書いてあることは何も起きません。付けなければ、新しくインストールした Hermes はこれまでとまったく同じように動きます（初回起動時にプロバイダーの選択画面が出ます）。この注記は提供が完了したら削除されます。
:::

新しくインストールした Hermes は、API キーを貼り付けたりどこかにサインインしたりする前から使えます。Hermes は起動時に **Nous の無料枠** を準備し（数秒かかり、「Setting up free inference…」と表示されます）、`nous/welcome` モデルで応答します。設定することも、ウィザードを進めることもありません。`hermes setup` は使いたいときのために残っていますが、実行を求められることはありません。

## 最初から使えるもの {#what-you-get-out-of-the-box}

| | 無料枠 | サインイン後 |
|---|---|---|
| 推論 | `nous/welcome`（1 モデル） | Nous Portal の全モデル |
| コネクタ（Gmail、Linear、Notion など） | 使える | 使える |
| [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) 経由の有料ツール（ウェブ検索、画像生成、TTS、クラウドブラウザ） | 使えない | 使える（サブスクリプションに課金） |
| クレジットや残高 | なし | あり |

「コネクタ」とは、エージェントがそのサービス上で操作できるように Nous のポータルで連携するサードパーティのアカウントのことです。無料枠でもサインインなしで使えます。

裏で動く処理（会話の圧縮、チャットのタイトル付け、画像の理解など）も `nous/welcome` で実行されます。

無料枠が推論を担っているあいだは、バナーと `hermes auth status` に `Nous · free tier · nous/welcome` と表示され、`hermes model` にはその 1 モデルだけを持つ **Nous · free tier** の行が出ます。無料枠で別のモデルを指定すると、黙って切り替えるのではなく、次のような案内が表示されます。

```text
gpt-5 needs a Nous account or an API key. Use /login to sign in, or /model to pick another provider.
```

有料ツールを呼び出すと、チャットでは `This needs a Nous account. Use /login to sign in.` と表示されます（ターミナルでは `hermes auth upgrade` が案内されます）。そのツールを使わないままターンは続きます。

無料枠が推論を担っているときに `config.yaml` の `model.default` が `nous/welcome` 以外を指していても、Hermes は `nous/welcome` を使い、そのことを 1 行で知らせます。無料枠で使えるモデルはちょうど 1 つだけです。

## 自分の API キーと併用する {#using-your-own-api-key-alongside-it}

無料枠は最後の手段であって、優先されることはありません。自分で設定したプロバイダーがあれば、そちらが常に使われます。

| 持っているもの | 推論に使われるもの | コネクタ |
|---|---|---|
| 何もない | Nous の無料枠（`nous/welcome`） | 無料枠 |
| `.env` にある API キー（OpenRouter、OpenAI、Anthropic など） | 自分のキー | 無料枠 |
| `config.yaml` で設定した `model.provider` | そのプロバイダー | 無料枠 |
| Nous Portal へのサインイン | Nous Portal | 自分のアカウント |

すでにプロバイダーを設定している環境でも、コネクタが認証に使えるものを持てるよう、Hermes は起動時に一度だけ無料枠を準備します。推論は引き続き自分のプロバイダーで行われます。そのことは一度だけ、次のように通知されます。

```text
Free Nous inference and connectors are now available. /model to try them, /login to sign in.
```

`hermes model`（または `/model`）から、ほかのプロバイダーと同じように無料枠を明示的に選ぶこともできます。

## チャットやターミナルからサインインする {#signing-in-from-a-chat-or-terminal}

### チャットから {#from-a-chat}

Telegram、Discord など対応しているメッセージングプラットフォームの Hermes との DM で（Slack では `/hermes login`）、または CLI のチャットセッションで `/login` を実行します。ペアリング済みのダイレクトメッセージである必要があり、それ以外の場所では Hermes が `Sign in from a direct message with Hermes.` と返します。ntfy のような一斉配信型のプラットフォームも、同じ理由で拒否されます。

DM には受付の返事が届き、続けて 3 通のメッセージが届きます。同意用のリンク、1 行だけのサインインコード、そして `Do not share this code. Waiting for sign-in, up to N minutes.` です。Hermes が待っているあいだもチャットを続けられ、結果は同じ DM に届きます。`/login` をもう一度実行すると、最初のコードは新しいものに置き換わります。まだ `nous/welcome` を使っている進行中のセッションは、次のメッセージから確定したモデルに切り替わります。Ink TUI ではコードは表示されますが、完了の確認は表示されません。`/status` で確かめてください。

:::warning インストールごとにアカウントは 1 つ
`/login` は、コードを承認したアカウントにこの Hermes のインストール全体を結びつけます。推論も、コネクタも、そのインストールが応答するすべてのチャットも対象です。複数の人が DM できるゲートウェイでは、そのプラットフォームに `allow_admin_from` を設定して（[スラッシュコマンドのアクセスガイド](/hermes/docs/reference/slash-commands/) を参照）、運用者だけが実行できるようにしてください。
:::

### ターミナルから {#from-a-terminal}

```bash
hermes auth upgrade
```

1. Hermes が URL と短いコードを表示し、ブラウザを開きます。`--no-browser` を付けたときや SSH セッションのときは開きません。コードは誰にも教えないでください。
2. ブラウザで Nous Portal にサインインし、確認します。
3. ターミナルに戻ると `Signed in as you@example.com.` と表示されます。既定のモデルが `nous/welcome` だった場合は、アカウントでこれから使うモデルが 2 行目に表示されます（例: `Default model is now upstage/solar-pro4:free.`）。

推論はアカウントのモデル一覧に移り、有料ツールが使えるようになり、`hermes auth status` には無料枠の行ではなくアカウントが表示されます。
`nous/welcome` は無料枠専用です。これを使っていたアカウントは、プランのおすすめモデル（新しく `hermes model` で選ぶときに提案されるものと同じ）に切り替わります。自分で選んだ既定のモデルはそのまま残ります。その時点でおすすめが得られない場合は既定のモデルを設定せず、Hermes が `hermes model` を実行するよう案内します。

チャットでの `/login`、ターミナルでの `hermes auth upgrade` は、無料枠がある環境ならどこでも使えます。推論に自分の API キーを使っている環境も含みます。その場合でも、サインインすれば有料ツールが使えるようになります。

:::note 通常のログインは一からやり直しになります
`hermes auth add nous --type oauth` でもサインインできますが、無料枠をそのまま置き換えてしまい、コネクタは引き継がれません。残したいコネクタがあるときは、`/login` か、ターミナルなら `hermes auth upgrade` を使ってください。
:::

## Hermes Desktop の場合 {#on-hermes-desktop}

デスクトップアプリも CLI と同じ無料枠で動き、それを 4 か所に表示します。

| 場所 | 表示される内容 |
|---|---|
| 初回起動 | 準備完了の画面。「Hermes is ready.」と既定モデル `nous/welcome`、無料枠のバッジ、**Begin** が表示されます。その下に「Sign in with a Nous account instead」と「Other providers」があります。この画面は一度だけ表示されます。 |
| 自分の API キーがすでにある状態での初回起動 | 入力欄の上に一度だけ帯が出ます。「Free Nous inference and connectors are now available.」と、**Open model picker**、**Sign in**、**Dismiss** が並びます。 |
| ステータスバー | 無料枠が推論を担っているあいだ、「Nous · free tier · nous/welcome」のチップと **Sign in** のバッジが表示されます。バーの右クリックメニューから非表示にできます。 |
| Settings › Billing | 「You're on the Nous free tier」と **Sign in** ボタンが 1 つ表示されます。概要はプランが「Free tier」、モデルが `nous/welcome`、コネクタが「Included」です。残高も支払うものもないので、支払いや使用量の欄は表示されません。 |

どの場所からサインインしても、同じダイアログが開きます。コードとリンクが表示されるので、リンク（またはアプリが開いたブラウザ）を開いてポータルで確認すると、ダイアログの最後に「Signed in as you@example.com.」と、アカウントでこれから使う既定のモデルが表示されます。ブラウザでサインインを拒否したとき、コードの期限が切れたとき、新しいコードに置き換えられたときは、それぞれ専用のメッセージが表示され、無料枠のまま残ります。モデルの選択画面には無料枠が「Nous · free tier」の 1 行として並び、モデルは `nous/welcome` の 1 つだけです。選択画面の中にサインインの操作はありません。

デスクトップは、これらの情報をすべて CLI が書き込むのと同じローカルの状態から読み取ります。準備完了の画面と帯は、CLI の通知と同じ一度きりのフラグで管理されています。そのため、CLI で一度見た通知は、その無料枠 ID についてはデスクトップで再び表示されません。逆も同じです。

## 無料枠を切る {#turning-the-free-tier-off}

```bash
hermes config set nous.guest false
```

`nous.guest` は `config.yaml` の通常の設定（既定値は `true`）で、環境変数ではありません。
切ると次のようになります。

| | `nous.guest: true`（既定） | `nous.guest: false` |
|---|---|---|
| `nous/welcome` での無料の推論 | 使える | 無効 |
| サインインなしのコネクタ | 使える | 無効 |
| `hermes model` の無料枠の行 | 表示 | 非表示 |
| 何も設定していない新規インストール | すぐにチャットできる | `hermes setup` が案内される |
| Nous アカウントでのサインイン | 使える | 使える |

ほかには何も変わりません。サインイン済みの Nous アカウント、自分の API キー、ほかのすべてのプロバイダーはこれまでどおり動きます。`true` に戻せば、無料枠を必要とする次のコマンドのときに無料枠が戻ります。

## `hermes logout` の動作 {#what-hermes-logout-does}

| 状況 | 結果 |
|---|---|
| 無料枠しかない | 何も消去されません。Hermes は `You're not signed in. Free inference and connectors are always on. Run hermes auth to sign in with a Nous account.` と表示します。 |
| Nous アカウントでサインイン済み | サインイン情報がこのプロファイルと共有ストアから削除されるので、この端末のほかのプロファイルが再び拾うこともありません。`nous.guest: true` なら、次の起動時に無料枠に戻ります。 |
| ほかのプロバイダーを使っている | これまでと同じ動作で、そのプロバイダーの保存済み認証情報が消去されます。 |

無料枠をリセットしたり作り直したりするコマンドはありません。無料枠は一度作られたあとは自分で管理されます。

## トラブルシューティング {#troubleshooting}

| 症状 | 意味 | 対処 |
|---|---|---|
| 最初のコマンドで `It looks like Hermes isn't configured yet` と表示され、`hermes setup` が案内される | 数秒以内に無料枠を準備できませんでした。オフラインである、Hermes が接続しているポータルで無料枠が提供されていない、またはレート制限を受けている、のいずれかです。 | オンラインに戻ってからもう一度コマンドを実行するか、`hermes setup` を実行して自分のプロバイダーを追加します。設定が中途半端に残ることはありません。 |
| `Nous free tier is not open on this portal.` | Hermes が接続しているポータルが、いま無料枠を提供していません。`HERMES_PORTAL_BASE_URL` を設定している場合、そのポータルにはそもそも無料枠がないかもしれません。 | アカウントでサインインするか、もう要らないポータルの上書き設定を外すか、`hermes setup` で自分のキーを追加します。 |
| `Nous free tier is rate limited; try again shortly.` | ポータルがいま、無料枠の新規準備を制限しています。 | 数分待ってからやり直すか、`hermes setup` で自分のキーを追加します。 |
| `This needs a Nous account.` | 無料枠で、Tool Gateway の有料ツールを呼び出しました。 | チャットなら `/login`、ターミナルなら `hermes auth upgrade` を実行するか、`hermes tools` でそのツールに自分のキーを設定します。 |
| モデルの選択画面で Nous の下に `nous/welcome` しか出ない | 無料枠では想定どおりの動作です。 | すべてのモデルを使うにはサインインするか、別のプロバイダーの API キーを追加します。 |
| 2 週間使わずにいたら無料枠が動かなくなった | 無料枠の ID の期限が切れました（下記を参照）。次の起動時か、ターンやコネクタが期限切れを検出した時点で新しい ID に置き換わります。 | 何もしなくて構いません。Hermes をもう一度起動してください。サインインしていなかった場合、使わなかった期間より前に連携したコネクタは、もう一度連携し直す必要があります。 |

## プライバシー {#privacy}

無料枠を動かすため、Hermes は必要になった最初のタイミングで Nous のポータル上に ID を作成し、その認証情報を Hermes のディレクトリに保存します。この認証情報は、そのディレクトリの下にあるプロファイルのあいだで共有されます。この ID にはメールアドレスも名前も、そのほかの個人情報も含まれません。推論やコネクタの呼び出しを認証し、レート制限をかけるためだけに存在します。14 日間使われないと期限が切れ、次にコマンドを実行したときに Hermes が自動で新しい ID を作ります。サインインすると（`/login`、ターミナルなら `hermes auth upgrade`）、その ID が持っていたもの（連携したコネクタ）はアカウントへ移されます。`nous.guest: false` で無料枠を切れば、ID は一切作られず、使われることもありません。
