---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "ブラウザ vault プラグイン"
description: "ctx.register_login_backend で browser_vault にパスワードマネージャーを追加する方法と、そのとき適用される分離のルール"
upstream_path: developer-guide/browser-vault-plugin.md
upstream_blob: b538b352e127672be0e0fa0f66a14fc1d7bb9de8
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/browser-vault-plugin
---

# ブラウザ vault プラグイン {#browser-vault-plugins}

プラグインは、パスワードマネージャー（KeePass、チームの vault、ハードウェアで守られたストアなど）を
`browser_vault` ツールのログインの取得元として追加できます。ただし、確認済みの提供元から来たものに限ります。プラグインカタログを通じたそのマネージャーの提供元か、
Nous です（[バックエンドを登録できるプラグイン](#who-can-register-a-backend)を参照）。登録すると、エージェントはそのマネージャーのログインを、内蔵の Hermes vault・1Password・Bitwarden と同じやり方で
一覧にして入力します。エージェントに見えるのはハンドルとメタデータだけで、パスワードは見えません。

ブラウザのログインバックエンドは[シークレットソース](/hermes/docs/developer-guide/secret-source-plugin/)とは別物です。`SecretSource`
を登録しても、パスワードマネージャーが `browser_vault` で使えるようにはなりません。

## バックエンドを登録する {#registering-a-backend}

**プロセス内**で動くプラグインは `agent.vault_backends.base.LoginBackend` のサブクラスを作り、そのインスタンスを1つ登録します。

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

バックエンドは、ユーザーがプロファイルで有効にするまでオフのままです。

```yaml
vault:
  keepass:
    enabled: true   # exactly true; installed code is never enabled automatically
```

バックエンドを生成する時点では、認証情報を取りに行ったりプロファイルの状態を読んだりしないでください。有効なプロファイルの
設定は、必要になったときに読みます。登録はプロファイル単位で、プラグインがアンロードされると取り除かれます。

## バックエンドを登録できるプラグイン {#who-can-register-a-backend}

パスワードマネージャーとの連携は、確認済みの提供元からしか受け付けません。`ctx.register_login_backend` を
受け付けるのは次のプラグインです。

- Hermes に同梱されているプラグイン
- [Hermes プラグインカタログ](/hermes/docs/developer-guide/plugins/catalog-submission/)からインストールしたプラグインのうち、
  `tier: verified`（パスワードマネージャーの提供元自身が公開したもの）か `tier: official`
  （Nous が保守しているもの）で、カタログの審査済みのピンに沿ったもの

それ以外のプラグインは、このルールを名指ししたログ行を出して登録の時点で拒否されます。対象は、手で
`~/.hermes/plugins/` に置いたプラグイン、Git URL からのインストール、community tier のカタログ項目、`--ref` でピンから外したカタログの
インストール、`--allow-removed` を付けてインストールしたもの、プロジェクトプラグイン、
pip のエントリーポイントプラグインです。出どころは Hermes 自身のインストール記録
（`plugins/.install-metadata.json`。インストーラーが書き込みます）から読み、プラグインの中のファイルからは読みません。そのため、
自前の `.hermes-catalog.json` を同梱したリポジトリでも何も得られません。このルールを緩める設定キーはありません。

パスワードマネージャーを作っていて Hermes で使えるようにしたい場合は、自分のリポジトリからプラグインをカタログに提出し、
`verified` tier を申請してください（カタログの受け入れルール 18）。提供元が連携を公開していないマネージャー
については、Nous が `official` の項目として用意します。

## 分離のルール {#isolation-rules}

Hermes は、vault ツールに渡す前に、プラグインのバックエンドをすべてコア側が持つアダプターで包みます。次のルールは、
プラグインがクラスをどう実装していても成り立ちます。

| ルール | バックエンドにとっての意味 |
|---|---|
| **自分の名前空間だけ** | ハンドルは `<name>:…` の形になります。Hermes は登録された名前から所有者を判断するので、`owns()` を呼ぶことはなく、`vault_…`（Hermes vault）、`op:…`、`bw:…`、ほかのプラグインのハンドルを渡すこともありません。`list_items()` が返したアイテムのうち、ID が自分の名前空間の外にあるものは捨てられます。`get_meta()` が返した ID が求めたハンドルと違う場合、その答えは無視されます。 |
| **ハンドルを受け取り、値を返す** | `list_items()` には引数がありません。`get_meta()`、`resolve_password()`、`resolve_otp()`、`resolve_secret()` が受け取るのは自分のハンドルだけです。ページ、CDP やブラウザのセッション、タスク、ほかの vault の項目、ほかのバックエンドで復号された値を受け取ることはありません。 |
| **マスターパスワードを尋ねない** | Hermes のロック解除のプロンプトは内蔵のマネージャー専用です。`needs_unlock = True` のバックエンドは登録の時点で拒否され、プラグインのバックエンドに `unlock` アクションが提示されることはありません。そのため、プラグインがラベルを付けたダイアログにマスターパスワードを入力するよう、ユーザーが求められることはありません。認証は、マネージャー自身のエージェント、セッション、OS のキーチェーンを使って行ってください。 |
| **予約された名前空間** | `local`、`onepassword`、`bitwarden`、`vault`、`op`、`bw` という名前と、内蔵のプレフィックスの内側に入るプレフィックス（`vault_x:`）は拒否されます。同じプロファイルでほかのプラグインがすでに使っている名前も拒否されます。内蔵でもプラグインでも、どのバックエンドも置き換えたり覆い隠したりはできません。`name` と `prefix` はプロパティではなく単純な文字列の属性でなければならず、クラスで `__getattribute__` や `__class__` を上書きしてもいけません。Hermes はコードを実行せずに登録を判定するからです。 |
| **既定はオフ** | バックエンドを有効にするのは `vault.<name>.enabled: true` だけです。 |
| **プロセス内だけ** | `plugins.isolation: host` のもとでは `ctx.register_login_backend` は拒否されます。`fill_context()` がサーバー内で動くコンテキストマネージャーだからです。 |
| **入力の経路は同じ** | プラグインのアイテム（パスワードと、自動で入るワンタイムコード）も、内蔵のアイテムと同じ経路を通ります。オリジンの完全一致の事前確認、ページ内でのオリジンの再確認、監督側での CDP によるシークレットの評価（argv は使いません）、支払いの確認です。 |
| **シークレットを会話に出さない** | 返した値は、ページに届く前にブラウザ結果の伏せ字処理の境界に登録されます。バックエンドが投げた例外は、ツールの結果・ログ行・例外の連鎖に届く前に固定のメッセージ（`The <name> login backend failed.`）に置き換えられるので、エラー文にシークレットが入っていてもモデルには届きません。型の違う値も同じように拒否されます。Hermes は、返された値（メタデータの各フィールド、パスワード、コード）を同じ保護の内側で自前の単純なオブジェクトにコピーするので、フィールドを読む途中で起きたエラーにも固定のメッセージが使われます。 |

プロセス内のプラグインは Hermes の中で動く普通の Python なので、これらのルールは API の取り決めであって、
サンドボックスではありません。Hermes がほかのバックエンドのデータをそのバックエンドに渡さないことは保証しますが、
同じプロセス内の任意のコードがファイルを読むことまでは止めません。上の出どころのルールは、この接続口をどのプラグインに
開くかを決めるもので、これもサンドボックスではありません。

## 入力のコンテキスト {#fill-context}

`fill_context()` は既定では何もしません。バックエンドは自前のコンテキストマネージャーを返して、入力をロックし、
操作全体のあいだ認証情報の参照とオリジンの設定を固定できます。こうすると、再読み込みによって古い
メタデータと新しく設定したシークレットが組み合わさることがなくなります。Hermes がこのコンテキストに入るのは、自分のハンドルを入力するとき
（パスワードの入力と、`browser_vault action=enter_code` での自動のワンタイムコードの入力。どちらもページ内での書き込みです）だけで、
しかもページのオリジンがアイテムの `get_meta()` と一致したあとに限ります。別の
オリジンのページがこのコンテキストを開くことはありません。コンテキストの中で Hermes はもう一度 `get_meta()` を呼び、固定されたアイテムがまだそのページのオリジンに
紐づいていなければ入力を拒否します。そのため、確認したオリジンと取り出したシークレットは同じ時点の状態から来ます。
`fill_context()` は引数なしで呼ばれ、`(None, None, None)` で抜けるので、コア側の例外が見えることはありません。入力が
失敗したときも、抜けるときには必ず解放してください。入力のロックは、関係のないブラウザの移動まで順番待ちにはしません。

## エラーの書き方 {#writing-errors}

例外は、決まった内容の診断メッセージで投げてください。Hermes は例外の文面を捨てますが、自前のログには
記録されることがあるので、認証情報の値やシークレットマネージャーの応答本文を入れないでください。パスワードを返すツールを
モデルに公開してはいけません。上のルールをすべて迂回してしまいます。
