---
title: "1Password"
description: ""
upstream_path: user-guide/secrets/onepassword.md
upstream_blob: 787d996cb67b0ae232ddb64475cd5f6ed588cb84
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/secrets/onepassword
---

# 1Password {#1password}

プロバイダーの API キーを `~/.hermes/.env` に平文で置く代わりに、起動時に [1Password](https://1password.com/) から取り出します。キーは 1Password のアイテムとして持っておき、`op://vault/item/field` の形で参照します。認証情報の入れ替えは、1Password での 1 回の変更で済みます。

## 仕組み {#how-it-works}

1. 公式の [1Password CLI](https://developer.1password.com/docs/cli/get-started/)（`op`）を入れて認証します。認証の方法は、**サービスアカウントのトークン**（画面のないサーバー向け）か、**対話的なデスクトップのセッション**（手元のノート PC 向け）のどちらかです。
2. 環境変数の名前と `op://` の参照との対応を、`~/.hermes/config.yaml` に書きます。
3. `hermes`（あるいはゲートウェイや cron ジョブ）が起動するたび、`~/.hermes/.env` を読み込んだあとに Hermes が参照ごとに `op read` を実行し、取り出した値を `os.environ` に入れます。
4. 既定では、Hermes はすでに環境にある値を**上書き**します。つまり 1Password が正本になるということで、認証情報を 1 回入れ替えれば、次に起動したすべての Hermes のプロセスがそれを拾います。`.env` のほうを勝たせたいなら `override_existing: false` にしてください。

Hermes が代わりに認証することはありませんし、`op` を勝手にダウンロードすることもありません。すでに入れて信頼している CLI を呼び出すだけです。`op` が無い、セッションがロックされている、参照が間違っているといった場合、Hermes は 1 行の警告を出して、`.env` にすでにあった認証情報のまま先へ進みます。起動を止めることはありません。

## 認証 {#authentication}

`op` には、人が付いていなくても使いやすいモードが 2 つあります。Hermes はどちらでも動きます。

- **サービスアカウント**（サーバーや CI におすすめ）: 1Password でサービスアカウントを作り、対象の保管庫への読み取り権限を与えて、そのトークンを `~/.hermes/.env` に `OP_SERVICE_ACCOUNT_TOKEN` として書き出します。トークンそのものが認証情報なので、他のベアラートークンと同じ扱いにしてください。
- **デスクトップ / 対話的なセッション**（ノート PC など）: `op signin` を実行します（または 1Password アプリで CLI 連携を有効にします）。Hermes は `OP_SESSION_*` の変数を `op` の子プロセスへそのまま渡します。1Password 用のキャッシュのキーにはこれらのセッション変数が含まれるので、別のアカウントでサインインしたときに、前の身元でキャッシュした値が返ることはありません。

## 最初に必要なトークン {#bootstrap-token}

**サービスアカウントのトークン**で認証する場合、そのトークンは、`op://` の参照を解決する*前に*必要になる、最初の認証情報です。シークレットを解決するすべてのプロセスの `os.environ` に入っていなければなりません。対話的なゲートウェイだけでなく、cron ジョブ（`kanban.dispatch_in_gateway: false`）、サブプロセスからの呼び出し、CLI の実行、macOS の launchd エージェント、Docker コンテナも含みます。用意する方法は 3 つあり、優先されるのは次の順です。

1. **`~/.hermes/.env` に置く（おすすめ）。** `hermes secrets onepassword setup --token <token>` を実行すると、Bitwarden の `BWS_ACCESS_TOKEN` とまったく同じように、トークンが `~/.hermes/.env` に書き込まれます。`load_hermes_dotenv()` が常に `.env` を読むので、追加の設定なしでどこからでも使えます。いちばん単純で確実な方法です。

2. **`~/.hermes/.op.env` に置く（git の管理外）。** サービスアカウントのトークンを `.env` から外したい場合、たとえば `.env` は非公開の dotfiles リポジトリに入れつつトークンだけはバージョン管理から外したい場合は、`~/.hermes/.op.env` に置きます。

   ```bash
   echo 'OP_SERVICE_ACCOUNT_TOKEN=ops_...' > ~/.hermes/.op.env
   chmod 600 ~/.hermes/.op.env
   ```

   Hermes は起動時に `.op.env` を、`.env` の**あとで**自動的に読み込みます。すでに環境にあるトークンを上書きすることは**ありません**。`.op.env` は git の管理外なので、トークンがコミットされるファイルに入ることはありません。

3. **systemd の `EnvironmentFile` で渡す（Linux のゲートウェイ）。** ゲートウェイを systemd で動かしているなら、サービスの環境変数として直接注入できます。

   ```ini
   [Service]
   EnvironmentFile=-/home/youruser/.hermes/.op.env
   ```

   この形で渡したトークンが優先されます。Hermes は `OP_SERVICE_ACCOUNT_TOKEN` がすでに設定されていることを見て、`.op.env` の読み込みを丸ごと飛ばします。

トークンが対話的なシェルからしか手に入らない状態（`op signin` や `.bashrc` での `OP_SESSION_*` の export など）だと、cron ジョブや新しく起動したサブプロセスには**引き継がれません**。そうした場面では警告が出て、`.env` にすでにあった認証情報が使われます。人が付いていない処理には、上の 3 つのどれかを使ってください。

## 設定する {#setup}

### 1. `op` を入れてサインインする {#1-install-and-sign-in-to-op}

[1Password CLI の導入手引き](https://developer.1password.com/docs/cli/get-started/) に従って入れます。動くことを確認します。

```bash
op whoami
```

### 2. 連携を有効にする {#2-enable-the-integration}

```bash
hermes secrets onepassword setup
```

これは `op` が `PATH` にあることを確かめ（無ければ `--binary-path` で指定します）、アカウントとトークンの設定を記録し、有効なセッションがあるかを調べて、`secrets.onepassword.enabled: true` に切り替えます。対話せずに済ませるフラグは次のとおりです。

```bash
hermes secrets onepassword setup \
  --account my.1password.com \
  --token-env OP_SERVICE_ACCOUNT_TOKEN \
  --token "$OP_SERVICE_ACCOUNT_TOKEN"
```

### 3. 認証情報を対応付ける {#3-map-your-credentials}

参照の書式は `op://<vault>/<item>/<field>` です。

```bash
hermes secrets onepassword set OPENAI_API_KEY    "op://Private/OpenAI/api key"
hermes secrets onepassword set ANTHROPIC_API_KEY "op://Private/Anthropic/credential"
```

### 4. 下見をして確認する {#4-preview-and-confirm}

```bash
hermes secrets onepassword sync     # dry-run: resolve now, show what would apply
hermes secrets onepassword status   # config + binary + references + auth
```

これ以降、`hermes` を実行するたびに起動時に参照が解決されます。1 つのプロセスの中で最初に反映されたときには、標準エラー出力に 1 行の要約が出ます。

## CLI {#cli}

| コマンド | 何をするか |
|---|---|
| `hermes secrets onepassword setup` | `op` を確認し、アカウントとトークンの環境変数を設定して有効にする |
| `hermes secrets onepassword status` | 設定・実行ファイル・認証・登録済みの参照を表示する |
| `hermes secrets onepassword token` | サービスアカウントのトークンを入れ替える。`op whoami` で確かめてから `.env` に保存する |
| `hermes secrets onepassword set ENV_VAR "op://…"` | 環境変数を参照に対応付ける（前後の空白を落として書式を検証してから保存） |
| `hermes secrets onepassword remove ENV_VAR` | 対応付けを外す |
| `hermes secrets onepassword sync` | 試しに実行する。今すぐ参照を解決して、何が反映されるかを表示する |
| `hermes secrets onepassword sync --apply` | 解決して、今のシェルの環境変数として書き出す |
| `hermes secrets onepassword disable` | `enabled: false` に切り替える。対応付けはそのまま残る |

`onepassword` の代わりに `op` と `1password` も使えます。

## 設定 {#configuration}

`~/.hermes/config.yaml` の既定値は次のとおりです。

```yaml
secrets:
  onepassword:
    enabled: false
    env:
      OPENAI_API_KEY: "op://Private/OpenAI/api key"
      ANTHROPIC_API_KEY: "op://Private/Anthropic/credential"
    account: ""
    service_account_token_env: OP_SERVICE_ACCOUNT_TOKEN
    binary_path: ""
    cache_ttl_seconds: 300
    override_existing: true
```

| キー | 既定値 | 何をするか |
|---|---|---|
| `enabled` | `false` | 全体の切り替えです。false のあいだ、`op` は一度も呼ばれません。 |
| `env` | `{}` | 環境変数の名前と `op://vault/item/field` 形式の参照との対応表です。名前が環境変数として正しくないもの、値が `op://` の参照でないものは、警告を出して飛ばされます。 |
| `account` | `""` | `op read --account` へ渡す、アカウントの短縮名またはサインイン用のアドレスです。空にすると `op` の既定のアカウントを使います。 |
| `service_account_token_env` | `OP_SERVICE_ACCOUNT_TOKEN` | サービスアカウントのトークンを読み取る環境変数です。その値は `op` の子プロセスへ、`OP_SERVICE_ACCOUNT_TOKEN` という名前で渡されます（`op` が期待する名前です）。この変数を設定しないままにすると、デスクトップの対話的なセッションを使います。 |
| `binary_path` | `""` | `op` の絶対パスです。設定するとその値がそのまま使われ、`PATH` は**参照されません**。`PATH` の先頭に現れた `op` を信用したくない場合は、ここで固定してください。 |
| `cache_ttl_seconds` | `300` | 解決した値をどれだけの時間使い回すかです（プロセス内とディスク上の両方）。`0` にすると**両方**のキャッシュが切れ、ディスクには値が一切書かれなくなります。 |
| `override_existing` | `true` | true のとき、解決した値が環境にすでにある値を上書きします（入れ替えが実際に効くようにするためです）。`.env` やシェルの export を勝たせたいなら `false` にします。その場合、該当する参照は `op` を呼ぶ*前に*飛ばされます。 |

## うまくいかないときの挙動 {#failure-modes}

1Password が Hermes の起動を止めることはありません。何か問題が起きても、標準エラー出力に 1 行の警告が出るだけで、Hermes はそのまま動き続けます。

| 症状 | 原因 | 対処 |
|---|---|---|
| `the op CLI was not found on PATH` | `op` が入っていない、または PATH にない | CLI を入れるか、`secrets.onepassword.binary_path` を設定する |
| `op read failed for 'op://…': …` | セッションがロックされている、トークンの期限が切れている、保管庫へのアクセス権が無い | `op signin` する、`hermes secrets onepassword token` でサービスアカウントのトークンを入れ替える、あるいはサービスアカウントに権限を与える |
| `op read returned an empty value for 'op://…'` | 参照先のフィールドはあるが、中身が空 | 1Password 側でアイテムやフィールドを直す（空の値が反映されることはないので、今の環境変数はそのまま残ります） |
| `… is not an op:// secret reference` | 対応表の値が `op://` の参照になっていない | `op://vault/item/field` の形で設定し直す |
| `op read timed out` | ネットワークが遮断されている、または 1Password が遅い | つながるか、デスクトップアプリとの連携が効いているかを確認する |

起動時の警告には `→` から始まる対処の行が付き、どのコマンドで直せるかがそのまま書かれています。

## キャッシュ {#caching}

参照をすべて取り出せた場合、その結果はプロセス内と、ディスク上の `<hermes_home>/cache/op_cache.json`（アトミックに、モード `0600` で書かれます）にキャッシュされます。短命な `hermes` の実行が続いても、参照ごとに `op` を呼び直さずに済むためです。このキャッシュには次の性質があります。

- 保存するのは解決したシークレットの**値**だけです。サービスアカウントのトークンや生の認証情報は入りません（認証情報は指紋にしてキャッシュのキーへ混ぜます）。
- トークン、アカウント、`OP_SESSION_*` の変数、参照の顔ぶれのいずれかが変わると無効になります。
- 1 つでも参照の解決に失敗した取得では、**書き込まれません**。一時的な認証の失敗が、有効期限のあいだ固定されてしまわないようにするためです。
- `cache_ttl_seconds: 0` にすると、読み込みも書き込みも含めて完全に無効になります。

## セキュリティ上の注意 {#security-notes}

- 1Password のサービスアカウントのトークンは、そのアカウントがアクセスできるシークレットをすべて読めます。保存先は `config.yaml` ではなく `~/.hermes/.env` にして、漏れたら 1Password で失効させて作り直してください。
- Hermes は、`override_existing: true` であっても、解決した値でトークンの環境変数自体を上書きすることを拒みます。
- `op` の子プロセスに渡す環境変数は、許可した最小限のもの（認証やセッションの変数と `PATH` / `HOME`）だけで、`os.environ` の丸写しではありません。dotenv を読んだあとのプロバイダーの認証情報が、まとめて子プロセスへ引き継がれることはありません。
- 参照は `op://` で始まることを検証したうえで、オプションの終端を示す `--` のあとに渡します。細工した値が `op` のフラグとして解釈されることはありません。

## 使わないほうがよい場面 {#when-not-to-use-this}

- **1 台で個人的に使っている環境**で、`~/.hermes/.env` で十分な場合。
- **閉じたネットワーク**で 1Password に届かない場合。
- **CI/CD** で、すでにシークレットを流し込む仕組みが整っている場合。経路は 2 つでなく 1 つに決めてください。

向いているのは、複数の端末をまとめて運用している場合、共用の開発機、ゲートウェイ用の VPS、そのほか複数の Hermes を入れた環境で、入れ替えと失効を一箇所で済ませたい場合です。
