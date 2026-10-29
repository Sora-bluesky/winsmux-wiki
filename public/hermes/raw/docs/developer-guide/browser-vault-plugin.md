---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "ブラウザ保管庫プラグイン"
description: "ctx.register_login_backend でパスワードマネージャーを browser_vault に追加する方法と、その際に適用される分離ルール"
upstream_path: developer-guide/browser-vault-plugin.md
upstream_blob: ec33caa5f860bad16cc0047fa7a8f3d435c1218a
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/browser-vault-plugin
---

# ブラウザ保管庫プラグイン {#browser-vault-plugins}

プラグインを使うと、パスワードマネージャー（KeePass、チーム向けの保管庫、ハードウェアで保護されたストアなど）を
`browser_vault` ツールのログイン情報の取得元として追加できます。ただし、そのプラグインが検証済みの提供元から来ている場合に限ります。検証済みの提供元とは、プラグインカタログを通じて公開するパスワードマネージャーのベンダー自身か、
Nous のことです（[バックエンドを登録できるプラグイン](#who-can-register-a-backend)を参照）。登録後、エージェントはそのマネージャーのログイン情報を、
組み込みの Hermes 保管庫、1Password、Bitwarden と同じように一覧表示して入力できます。エージェントに見えるのはハンドルとメタデータだけで、パスワードそのものが見えることはありません。

ブラウザのログインバックエンドは、[シークレットソース](/hermes/docs/developer-guide/secret-source-plugin/)とは別の仕組みです。`SecretSource`
を登録しても、パスワードマネージャーが `browser_vault` で使えるようにはなりません。

## バックエンドを登録する {#registering-a-backend}

**プロセス内**で動くプラグインは、`agent.vault_backends.base.LoginBackend` のサブクラスを作り、そのインスタンスを 1 つ登録します。

```python
from agent.vault_backends.base import LoginBackend
from agent.vault_store import VaultItemMeta

class KeePassBackend(LoginBackend):
    name = "keepass"            # lowercase identifier; also the config key
    prefix = "keepass:"         # must be exactly "<name>:"
    display_name = "KeePass"

    def list_items(self) -> list[VaultItemMeta]:
        ...  # metadata only: ids "keepass:<opaque>", exact HTTPS origins, identifier

    def get_meta(self, handle: str) -> VaultItemMeta | None:
        ...

    def resolve_password(self, handle: str) -> str:
        ...  # called once per fill, after the page origin matched the item

def register(ctx):
    ctx.register_login_backend(KeePassBackend())
```

バックエンドは、ユーザーがプロファイルで有効にするまで無効のままです。

```yaml
vault:
  keepass:
    enabled: true   # exactly true; installed code is never enabled automatically
```

バックエンドを生成する時点では、認証情報の取得やプロファイルの状態の読み込みをしないでください。有効なプロファイルの設定は、
必要になったときに初めて読み込むようにします。登録はプロファイル単位で行われ、プラグインがアンロードされると解除されます。

## バックエンドを登録できるプラグイン {#who-can-register-a-backend}

パスワードマネージャーとの連携は、検証済みの提供元からのみ受け付けます。`ctx.register_login_backend` を
呼び出せるのは次のプラグインです。

- Hermes に同梱されているプラグイン
- [Hermes プラグインカタログ](/hermes/docs/developer-guide/plugins/catalog-submission/)からインストールされたプラグインのうち、
  `tier: verified`（パスワードマネージャーのベンダー自身が公開）または `tier: official`
  （Nous が保守）のもので、カタログでレビュー済みのバージョンに固定（ピン留め）されているもの

それ以外のプラグインはすべて登録時に拒否され、このルールによるものだとわかるログが出力されます。具体的には、
`~/.hermes/plugins/` に手動で置いたプラグイン、Git の URL からのインストール、コミュニティ tier のカタログ項目、
`--ref` でピン留めから外したカタログのインストール、`--allow-removed` を付けてインストールしたもの、プロジェクトプラグイン、
pip のエントリポイントプラグインが該当します。提供元の情報は Hermes 自身のインストール記録
（インストーラーが書き込む `plugins/.install-metadata.json`）から読み取り、プラグイン内部のファイルは参照しません。そのため、
リポジトリに独自の `.hermes-catalog.json` を含めても効果はありません。このルールを緩める設定キーもありません。

パスワードマネージャーを開発していて Hermes に対応させたい場合は、ご自身のリポジトリからプラグインをカタログに申請し、
`verified` tier を希望してください（カタログ掲載ルール 18）。ベンダーが連携プラグインを公開していないマネージャーについては、
Nous が `official` の項目として提供します。

## 分離ルール {#isolation-rules}

Hermes は、保管庫ツールに渡す前に、すべてのプラグインバックエンドを Hermes 本体が管理するアダプターで包みます。以下のルールは、
プラグインがクラスをどのように実装していても必ず適用されます。

| ルール | バックエンドにとっての意味 |
|---|---|
| **自分の名前空間のみ** | ハンドルは `<name>:…` の形式です。どのハンドルが誰のものかは登録された名前をもとに Hermes が判断するため、`owns()` が呼ばれることはなく、`vault_…`（Hermes 保管庫）、`op:…`、`bw:…` や、他のプラグインのハンドルが渡されることもありません。`list_items()` が返す項目のうち、ID が自分の名前空間の外にあるものは除外されます。また、`get_meta()` の応答の ID が要求したハンドルと一致しない場合、その応答は無視されます。 |
| **渡すのはハンドル、返すのは値** | `list_items()` には引数がありません。`get_meta()`、`resolve_password()`、`resolve_otp()`、`resolve_secret()` には自分のハンドルだけが渡され、それ以外は何も渡されません。ページ、CDP やブラウザのセッション、タスク、他の保管庫の項目、他のバックエンドの復号済みの値を受け取ることはありません。 |
| **マスターパスワードの入力を求めない** | Hermes のロック解除プロンプトは組み込みのマネージャー専用です。`needs_unlock = True` のバックエンドは登録時に拒否され、プラグインのバックエンドに `unlock` アクションが提供されることもありません。そのため、プラグインが名前を付けたダイアログでユーザーがマスターパスワードの入力を求められることはありません。認証は、マネージャー自身のエージェント、セッション、または OS のキーチェーンを通じて行ってください。 |
| **予約済みの名前空間** | `local`、`onepassword`、`bitwarden`、`vault`、`op`、`bw` という名前と、組み込みのプレフィックスに含まれるプレフィックス（`vault_x:`）は拒否されます。そのプロファイルで他のプラグインがすでに使っている名前も同様です。組み込みでもプラグインでも、既存のバックエンドを置き換えたり隠したりすることはできません。`name` と `prefix` はプロパティではなく通常の文字列属性にする必要があり、クラスで `__getattribute__` や `__class__` をオーバーライドすることもできません。Hermes は、プラグインのコードを実行せずに登録の可否を判断するためです。 |
| **既定では無効** | バックエンドを有効にできるのは `vault.<name>.enabled: true` だけです。 |
| **プロセス内のみ** | `plugins.isolation: host` の環境では `ctx.register_login_backend` は拒否されます。`fill_context()` がサーバー内でのみ動くコンテキストマネージャーだからです。 |
| **同じ入力経路** | プラグインの項目（パスワードと自動入力のワンタイムコード）も、組み込みの項目と同じ処理を通ります。つまり、オリジンの完全一致の事前チェック、ページ内でのオリジンの再確認、スーパーバイザーによる CDP でのシークレットの評価（argv は使いません）、支払いの確認です。 |
| **シークレットは会話に出さない** | バックエンドが返した値は、ページに届く前に、ブラウザ結果の秘匿処理の対象として登録されます。バックエンドが例外を送出した場合、その例外はツールの結果、ログ、例外チェーンに届く前に固定のメッセージ（`The <name> login backend failed.`）に置き換えられます。そのため、エラーメッセージにシークレットが含まれていてもモデルに届くことはありません。型が正しくない値も同じように拒否されます。Hermes は、返された内容（メタデータのフィールド、パスワード、コード）を同じ保護の中で Hermes 自身の単純なオブジェクトにコピーします。そのため、フィールドの読み取り中に発生したエラーにも固定のメッセージが使われます。 |

プロセス内で動くプラグインは Hermes の中で実行される普通の Python コードなので、これらのルールはサンドボックスではなく API の取り決めです。
Hermes が他のバックエンドのデータをあなたのバックエンドに渡さないことは保証されますが、
同じプロセス内の任意のコードがファイルを読むことまでは防げません。前述の提供元のルールは、
この仕組みをどのプラグインに提供するかを決めるものであり、これもサンドボックスではありません。

## 入力コンテキスト {#fill-context}

`fill_context()` は、既定では何もしません。バックエンドは独自のコンテキストマネージャーを返すことで、入力処理をロックし、
処理全体のあいだ認証情報の参照先やオリジンの設定を固定できます。これにより、途中で設定が再読み込みされても、古いメタデータと
新しく設定されたシークレットが組み合わさることはありません。Hermes がこのコンテキストに入るのは、あなたのハンドルを入力する場合だけです（パスワードの入力と、
`browser_vault action=enter_code` での自動入力のワンタイムコードで、どちらもページ内への書き込みによって行います）。さらに、
ページのオリジンが項目の `get_meta()` と一致した後に限られるため、別のオリジンのページがコンテキストを開くことはありません。コンテキストの中で Hermes は
`get_meta()` をもう一度呼び出し、固定された項目がまだそのページのオリジンに結び付いていなければ入力を拒否します。これにより、チェックしたオリジンと
取り出したシークレットが同じ時点の状態から得られたものになります。Hermes は `fill_context()` を引数なしで呼び出し、
`(None, None, None)` で抜けるため、Hermes 本体の例外がバックエンドに見えることはありません。入力が失敗した場合でも、
抜けるときには必ずロックを解放してください。なお、入力のロックは、関係のないブラウザの画面遷移までは直列化しません。

## エラーの書き方 {#writing-errors}

例外は固定の診断メッセージで送出してください。Hermes は例外のテキストを破棄しますが、あなた自身のログには記録される可能性があるため、
認証情報の値やシークレットマネージャーの応答本文を絶対に含めないでください。また、パスワードを返すツールをモデルから
使える形で公開してはいけません。上記のルールをすべてすり抜けることになります。

## ブラウザページのバックエンド {#browser-page-backends}

CDP エンドポイントを持たないプラグインのブラウザ（Camofox は独自の REST サーバーと通信します）には、保管庫のスーパーバイザーから
アクセスできません。そのため、`browser_vault` はすべての入力を「Could not determine the
current page origin」として拒否してしまいます。このようなプラグインは、`agent.browser_page_backend.BrowserPageBackend` を登録します。

```python
from agent.browser_page_backend import BrowserPageBackend

class MyBrowserPages(BrowserPageBackend):
    name = "mybrowser"

    def has_page(self, task_id: str) -> bool:
        ...  # True when this task already has a live tab here; never open one to answer

    def evaluate(self, task_id: str, expression: str, *, secret: bool):
        ...  # run the script on that tab and return its value; raise on failure

def register(ctx):
    if hasattr(ctx, "register_browser_page_backend"):  # older cores lack the seam
        ctx.register_browser_page_backend(MyBrowserPages())
```

`has_page(task_id)` が true のとき、保管庫は CDP の代わりに `evaluate` を通じて、ページのオリジンを読み取り、フォームを調べ、
パスワードを書き込みます。それ以外の処理はすべて Hermes 本体が担います。具体的には、オリジンの完全一致の事前チェックと
ページ内での再チェック、支払いの確認、Bot Desktop の操作引き継ぎのチェック、入力した値の秘匿処理です。シークレットを含むスクリプト（`secret=True`）は、
ページで発生した例外にページ内で対処できるよう包まれた状態で届きます。また、この経路で起きた失敗はすべて固定のテキストで報告されるため、
あなたの例外がモデルに届くことはありません。シークレットを含むスクリプトは、argv に載らず、ネットワーク上を平文で流れない通信経路
（ループバックまたは HTTPS）でのみ送信してください。リダイレクト先に送ったり、ログに記録したりしてはいけません。

前述の提供元のルールはここでも適用されます（同梱プラグイン、またはピン留めされたカタログの `verified`/`official`）。
また、`plugins.isolation: host` の環境では登録が拒否されます。入力用のスクリプトは
認証情報を含んでいるため、Hermes のプロセス内にとどめる必要があるからです。
