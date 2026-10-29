---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "パスワードとログイン"
description: "エージェントがパスワードを一度も見ることなく、サイトへのサインインや支払い、住所の入力を代わりに行います。"
upstream_path: user-guide/features/credential-vault.md
upstream_blob: b023c8c7953e0aefab46140487df83a6ca1928f6
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/credential-vault
---

# パスワードとログイン {#passwords-logins}

**「GitHub にログインして」** と頼めば、エージェントが代わりにサインインします。ログイン情報のないサインインページに初めてたどり着いたときは、その場で入力内容が伏せられるプロンプトを出して尋ねてきます。それ以降は何もしなくても動きます。パスワードはこの端末上で暗号化され、ページへ直接入力されます。モデルがパスワードを目にすることはありません。

設定は何も要りません。

## 実際の画面 {#what-it-looks-like}

**CLI / TUI**

```
🔐 Save login for github.com
   The agent reached a sign-in page with no saved login for this site.
   Type the email / username you sign in with (shown), then Enter.
   ...
   Now the password (hidden). It is encrypted on this machine, bound to
   https://github.com, and filled into the page without the model ever seeing it.
```

**デスクトップ** — 「github.com のログインを保存しますか？」というカードが表示され、ID の入力欄と、入力が伏せられるパスワード欄があります。*保存してサインイン* を押すと保存して先へ進み、*保存しない* を押すと、このターンのあいだはエージェントがもう尋ねてこなくなります。

それ以降、エージェントは保存済みのログインを一覧し、ID は自分で入力して、パスワードは Hermes を通して入力します。エージェントが受け取るツールの結果は `{filled_fields: 1, origin: "https://github.com"}` だけです。さらにパスワードは伏せ字処理の対象にも登録されるので、あとでページを読み取ったときにパスワードがそのまま出てくることもありません。

## 2 段階認証のコード {#two-factor-codes}

パスワードのあとにコードを求めるサイトも、同じように処理されます。

- **認証アプリの鍵をログインと一緒に保存している場合**（2FA を有効にするときにサイトが表示する「セットアップキー」や `otpauth://` のリンクのことです。TOTP のシードを持つ 1Password や Bitwarden のアイテムも含みます）: Hermes が現在のコードを生成して入力します。誰にも尋ねません。鍵は **設定 → パスワードとログイン → 追加** か `hermes vault add` で登録します。登録したアイテムには *2FA 自動* のバッジが付きます。パスワードと同じく、コードが生成されるのは、そのログインに保存したサイトのページに対してだけです。
- **コードがスマートフォンやメールに届く場合**: 使っている画面に小さなプロンプト（「github.com の確認コード」）が出るので、コードを入力すると Hermes がページに入力します。この場合もコードが会話に入ることはありません。
- **パスキー、ハードウェアキー、アプリでの承認**（「Duo で承認をタップ」など）: 入力するものはありません。エージェントが端末側で操作を済ませるよう伝え、ページが先へ進むのを待ちます。

## 1Password や Bitwarden をすでに使っている場合 {#already-using-1password-or-bitwarden}

有効にする操作は要りません。コマンドラインツールの `op` や `bw` がインストールされていてサインイン済みなら、Hermes が自動で検出し、そこに保存されたウェブサイトのログインもローカルのものと並んで入力に使えるようになります。エージェントがそうしたログインを初めて必要としたとき、マスターパスワードでパスワードマネージャーのロックを解除するよう求めてきます（入力は伏せられます。解除はセッションごとに 1 回で、30 分操作がないとロックされます）。Hermes はマスターパスワードを対話なしの経路でパスワードマネージャーの CLI へ渡し（`op signin` なら標準入力、`bw unlock
--passwordenv` なら子プロセスの環境変数）、メモリにはセッショントークンだけを残します。エージェントがマスターパスワードやトークン、ログイン情報を目にすることはありません。
パスワードマネージャーの項目に複数のウェブサイト（たとえば `amazon.co.uk`、
`www.amazon.co.uk`、`eu.account.amazon.com`）が登録されていれば、そのどれかとまったく同じ
オリジンで入力に使われます。項目に保存された URL から先を推し量ることはありません。

検出されたパスワードマネージャーを使いたくない場合は、`hermes vault sources --disable bitwarden` を実行するか、**設定 → パスワードとログイン** のスイッチで切ります。

## 支払いと住所の入力 {#paying-and-filling-addresses}

カードと住所もログインと同じしくみです。一度保存すれば（**設定 → パスワードとログイン → 追加**、または `hermes vault add`）、購入手続きをするサイトに紐づけられ、エージェントはそのサイトでだけ入力します。**カードを入力するときは毎回、先に確認を求めます**。危険なコマンドのときと同じ承認プロンプトで、断れば何も入力されません。ヘッドレスのセッション（cron、webhook、API サーバー）は確認に答えられないので拒否されます。そのため、購入ページまでたどり着いたプロンプトインジェクションがあっても、確認を求めることはできますが、お金を使うことはできません。住所の入力には確認は要りません。

## 保存した内容の管理 {#managing-whats-saved}

- **デスクトップ → 設定 → パスワードとログイン**: 保存したものすべてと、検出されたパスワードマネージャー（ロック解除 / ロック）、追加、削除があります。
- **CLI**: `hermes vault list`、`hermes vault add`、`hermes vault rm <handle>`、`hermes vault sources`、`hermes vault key`。

アイテムは `~/.hermes/vault/` の下に暗号化して保存され、プロファイルごとに分かれます。ラベル、サイトのオリジン、ログイン ID は見えるメタデータです。パスワードとカードの値は、ページへ入力されるとき以外に vault の外へ出ることはありません。

## vault の鍵の置き場所 {#where-the-vault-key-is-kept}

既定では、暗号化の鍵は暗号化された `vault.json.enc` の隣にある `~/.hermes/vault/vault.key`（`0600`）に置かれます。代わりに OS のキーチェーン（macOS のキーチェーン、Windows の資格情報マネージャー、Linux の Secret Service / KWallet）に置くこともできます。

```bash
hermes vault key                          # where the key is now, and whether a keychain is reachable
hermes vault key migrate --to keychain    # move it (installs the small `keychain` feature if needed)
hermes vault key migrate --to file        # move it back
```

移すときは、まず鍵をキーチェーンに書き込み、キーチェーン側の鍵で vault を復号できることを確かめてから、はじめて `vault.key` を削除します。そのため、移動が途中で止まっても vault は使える状態のままで、同じコマンドをもう一度実行すれば移動が終わります。あわせて `vault.key_storage` も設定されます。これは、**新しく作る** vault の鍵をどこに置くかを決める設定です。

```yaml
vault:
  key_storage: file        # default; or: keychain
```

`keychain` にしていてもキーチェーンに届かない環境（ヘッドレスの Linux サーバーや、デスクトップのキーリングがない SSH セッション）では、新しい vault の鍵はこれまでどおり `vault.key` に置かれ、ログに警告が出ます。キーチェーンのエントリーはプロファイルごとに別々で、その名前は `~/.hermes/vault/vault.keyref` に記録されます（このファイルに秘密は入っていません）。`hermes profile create --clone-all` で作ったプロファイルは、作成の途中で自分専用のエントリーを受け取ります。そのため、あとで元のプロファイルが鍵をファイルへ戻しても、コピー側が鍵を失うことはありません。その時点でキーチェーンに届かなければ、元のエントリーを共有する代わりに、メッセージを出してコピーを断ります。名前を変えたプロファイルは、初めて vault を開いたときに自分専用のエントリーへ切り替わり、元のエントリーを削除することはありません。

キーチェーンに置いたときに変わること:

- **バックアップやコピーには、鍵のない vault しか入りません。** `hermes backup`、同期やコピーをした `~/.hermes`、ディスクイメージには、vault を開くのに必要なものがすべてそろってはいません。プロファイルを別の端末へ移す前に、`hermes vault key migrate --to file` を実行してください。
- **キーチェーンが確認を求めることがあります。** macOS では、Hermes がそのエントリーを使ってよいか尋ねられることがあります（たとえば、アップデートで Hermes の Python が入れ替わったあと）。ロックされた Linux のキーリングは、ロック解除を求めてきます。ログアウト中に動く cron ジョブは鍵を読めないため、ローカルのログインは分かりやすいエラーで失敗します。
- **エントリーを失うと、アイテムも失われます。** キーチェーンのエントリーが削除されると vault は開けなくなり、Hermes はその上に新しい鍵を作らずに、開けないことを伝えます。キーチェーンのバックアップからエントリーを戻すか、最初からやり直すなら `vault.json.enc` を削除してください。

このため、キーチェーンへの保存は既定ではなく、自分で選んで有効にするものになっています。

## ヘッドレスのセッション {#headless-sessions}

cron ジョブ、webhook、API サーバー、`hermes chat -q` には、プロンプトに答える人がいません。保存済みのローカルのログインはそこでも使えます。ロックされたパスワードマネージャーは `unavailable_in_this_session` を、ログインが見つからないときは `prompt_unavailable` を返します。先に対話できるセッションでロックを解除するか保存しておくか、1Password のサービスアカウントトークン（`OP_SERVICE_ACCOUNT_TOKEN`）を渡してください。

```yaml
vault:
  onepassword:
    enabled: false          # opt OUT of a detected manager (default: on when installed)
    account: ""             # `op --account` shorthand; empty = default
    service_account_token_env: OP_SERVICE_ACCOUNT_TOKEN
  bitwarden:
    enabled: false
```

## 保証できること、できないこと {#what-this-does-and-does-not-guarantee}

**保証すること:** パスワードが Hermes を通してモデルのコンテキストに入ることはありません。ツールの結果にも、ログにも、セッションのデータベースにも、どのプロセスの CLI 引数にも入りません。入力は、監督下にあるブラウザセッションの CDP ソケットを直接使って行われます。ページのオリジンが保存したオリジンと完全に一致しない限り入力は拒否され、この確認は書き込む直前にページの中でもう一度行われます。CDP のエンドポイントを持たない Camofox ブラウザプラグインでも同じ確認が行われます。この場合の入力は Camofox の REST の evaluate エンドポイントを通して Camofox のタブへ送られ、それも `CAMOFOX_URL` がループバックか HTTPS のときに限られます。

**保証しないこと:** ページそのものからは守れません。サイトにパスワードを入力した時点で、そのサイト（とそこで動くスクリプト）はパスワードを手にします。これは自分で入力したときとまったく同じです。クラウドのブラウザバックエンドでは、提供元のブラウザがほかのページと同じようにそのページを見ます。オリジンへの紐づけは、間違ったサイトに入力しないための防御であって、正しいサイトが乗っ取られた場合の防御ではありません。

### vault に手が届くのは誰か {#who-can-get-at-the-vault}

| 誰が | `vault.key` ファイル（既定） | キーチェーンに保存 |
|---|---|---|
| このコンピューターのほかのユーザー（管理者を除く） | 防げます: どちらのファイルも `0600` です | 防げます |
| `~/.hermes` のバックアップ、同期したコピー、イメージを持っている人 | 復号できます: 鍵と vault が一緒に移るためです | 暗号文しか手に入りません |
| 電源の切れたディスクを持っていて、ディスク全体の暗号化がない場合 | 復号できます | そのキーチェーンを守っているものが必要です（macOS と Windows ではログインパスワード。暗号化していない Linux のキーリングは何も守りません） |
| 自分の権限で動くプログラム、または Hermes の中で動くプラグイン | 復号できます | キーチェーンに問い合わせたり、vault のコードを直接呼んだりはできます |
| 管理者 / root、または自分の権限を持つマルウェア | 復号できます | 復号できます |

パスワードマネージャー（1Password、Bitwarden）のセッショントークンは Hermes のメモリにだけ置かれ、30 分操作がないときやロックしたときに破棄されます。トークンが渡されるのは、それを必要とする `op`/`bw` のコマンド 1 回だけで、Hermes 自身の環境、ターミナルツール、ほかの子プロセスには渡りません。ふつうの import では届かないところに置かれているので、同じプロセスのほかのコードが気軽に触ることは防げますが、Hermes のメモリを本気で読もうとするプラグインまでは防げません。

肝心の境界はプラグインです。Hermes のプロセスの中で動くサードパーティーのプラグインは、保存したログインの入力も含め、Hermes にできることは何でもできます。ログインを保存していて、中身を確かめていないプラグインを入れるなら、[`plugins.isolation: host`](/hermes/docs/user-guide/features/plugins/#running-plugins-out-of-process-pluginsisolation) でプロセスの外で動かしてください。それでもプラグインのホストは自分のユーザーとして動き、自分が読めるファイルは読めます。確かな境界がほしいなら、`plugins.host.launcher` でサンドボックスを用意してください。
