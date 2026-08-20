---
title: "Bitwarden Secrets Manager"
description: ""
upstream_path: user-guide/secrets/bitwarden.md
upstream_blob: 671fb640fef781aacf418770bc94370bccd1c4b4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/secrets/bitwarden
---

# Bitwarden Secrets Manager {#bitwarden-secrets-manager}

API キーを `~/.hermes/.env` に平文で置く代わりに、起動時に [Bitwarden Secrets Manager](https://bitwarden.com/products/secrets-manager/) から取り込みます。最初に渡す 1 つのシークレット（マシンアカウントのアクセストークン）が、プロバイダーごとにいくつも持っていたキーの代わりになり、認証情報の入れ替えは Bitwarden の Web アプリでの 1 回の変更で済むようになります。

## 仕組み {#how-it-works}

1. Bitwarden Secrets Manager で**マシンアカウント**を作り、プロジェクトへの読み取り権限を与えて、**アクセストークン**を発行します。
2. Hermes はそのトークン 1 つを `~/.hermes/.env` に `BWS_ACCESS_TOKEN` として保存します。
3. `hermes`（あるいはゲートウェイや cron ジョブ）が起動するたび、`~/.hermes/.env` を読み込んだあとに Hermes が `bws secret list <project_id>` を呼び、返ってきたキーを `os.environ` に入れます。
4. 既定では、Hermes はすでに環境にある値を**上書き**します。つまり Bitwarden が正本になるということで、Web アプリでキーを 1 回入れ替えれば、次に起動したすべての Hermes のプロセスがそれを拾います。`.env` のほうを勝たせたいなら、設定で `override_existing: false` にしてください。

`bws` の実行ファイルは、最初に使うときに `~/.hermes/bin/` へ自動でダウンロードされます。`apt` も `brew` も `sudo` も要りません。

## なぜマシンアカウントなのか（そして 2 要素認証を求められない理由） {#why-machine-accounts-and-why-no-2fa-prompt}

Bitwarden Secrets Manager は、人が付いていない処理のために作られています。マシンアカウントは、その場に人がいない以上、2 要素認証で守ることができません。認証情報はアクセストークンそのものです。これを持っている人は、そのマシンアカウントが読めるシークレットをすべて読めてしまうので、価値の高いベアラートークンと同じように扱ってください。保存先は `config.yaml` ではなく `.env` にし、漏れたと思ったら Bitwarden の Web アプリで失効させて作り直します。

マシンアカウントを作るのは *Web アプリ*の中で、そこでは普段どおりの 2 要素認証がかかります。そのあとのトークンは、単独で動きます。

## 設定する {#setup}

### 1. マシンアカウントとアクセストークンを作る {#1-create-a-machine-account-and-access-token}

[Bitwarden の Web アプリ](https://vault.bitwarden.com)（EU のアカウントなら [vault.bitwarden.eu](https://vault.bitwarden.eu)）で次の手順を踏みます。

1. 製品の切り替えから **Secrets Manager** に移ります。
2. **Project** を作るか、既存のものを選びます（「Hermes keys」など）。
3. プロバイダーのキーをシークレットとして追加します。シークレットの **Name** がそのまま環境変数の名前になるので、`OPENROUTER_API_KEY`、`ANTHROPIC_API_KEY` のように付けてください。
4. **Machine accounts → New machine account → My Hermes machine** と進み、**Projects** タブで、作ったプロジェクトへの Read 権限を与えます。
5. **Access tokens** タブ → **Create access token** → 有効期限を **Never**（または任意の日付）にして、トークン（`0.` で始まります）をコピーします。Bitwarden はこれを二度と表示できないので、控えを必ず取っておいてください。

Secrets Manager は Bitwarden の無料プランにも制限付きで含まれているので、試すのに有料プランは要りません。

### 2. ウィザードを実行する {#2-run-the-wizard}

```bash
hermes secrets bitwarden setup
```

このコマンドは次の順に進みます。

1. `bws v2.0.0` を `~/.hermes/bin/bws` へダウンロードし、検証します。
2. アクセストークンの入力を求めます（入力は伏せ字になります）。`~/.hermes/.env` に `BWS_ACCESS_TOKEN` として保存されます。
3. マシンアカウントが属する Bitwarden の地域を尋ねます。**US Cloud**、**EU Cloud**、**自前ホスト / 独自 URL** から選びます。`config.yaml` に `secrets.bitwarden.server_url` として保存され、`bws` には `BWS_SERVER_URL` として渡されます。
4. マシンアカウントから見えるプロジェクトを一覧し、そこから 1 つ選ばせます。`config.yaml` に `secrets.bitwarden.project_id` として保存されます。
5. 試しにプロジェクトのシークレットを取得して、どの環境変数が埋まるかを表示します。
6. `secrets.bitwarden.enabled: true` に切り替えます。

対話せずに設定したい場合は、フラグでも指定できます。

```bash
hermes secrets bitwarden setup \
  --access-token "$BWS_ACCESS_TOKEN" \
  --server-url https://vault.bitwarden.eu \
  --project-id <project-uuid>
```

### 3. 確認する {#3-confirm}

```bash
hermes secrets bitwarden status
```

これ以降、`hermes` を実行するたびに起動時の新しいシークレットが取り込まれます。1 つのプロセスの中で最初に反映されたときには、標準エラー出力に 1 行の要約が出ます。

## CLI {#cli}

| コマンド | 何をするか |
|---|---|
| `hermes secrets bitwarden setup` | 対話式のウィザード（実行ファイルの導入、トークンの入力、プロジェクトの選択、取得の試験） |
| `hermes secrets bitwarden status` | 設定・実行ファイルの版・トークンの有無と有効性を表示する |
| `hermes secrets bitwarden token` | アクセストークンを入れ替える。新しいトークンを Bitwarden に問い合わせて確かめてから `.env` に保存する |
| `hermes secrets bitwarden sync` | 試しに実行する。今すぐシークレットを取得して、何が反映されるかを表示する |
| `hermes secrets bitwarden sync --apply` | 取得して、今のシェルの環境変数として書き出す |
| `hermes secrets bitwarden install` | 版を固定した `bws` の実行ファイルを落とすだけ（認証は不要） |
| `hermes secrets bitwarden disable` | `enabled: false` に切り替える。トークンとプロジェクト ID はそのまま残る |

## 期限切れや失効したトークンを入れ替える {#rotating-an-expired-or-revoked-token}

マシンアカウントのトークンが期限切れになった、失効させられた、あるいはアカウントごと消えた場合、起動時に次のように出ます。

```
Bitwarden Secrets Manager: Bitwarden rejected the machine-account access token (BWS_ACCESS_TOKEN) — it was likely revoked, expired, or belongs to another region.  (...)
Bitwarden Secrets Manager: → Run `hermes secrets bitwarden token` to paste a fresh access token ...
```

ウィザードを最初からやり直さなくても、これで直せます。

```bash
hermes secrets bitwarden token                     # masked prompt
hermes secrets bitwarden token --access-token 0.…  # non-interactive
```

このコマンドは、何かを書き込む**前に**新しいトークンで Bitwarden へ問い合わせます。受け付けられないトークンだった場合、今の `.env` には手を触れません。うまくいったときはトークンを保存し、取得結果のキャッシュを消して、設定してあるプロジェクトが新しいマシンアカウントから見えない場合は警告します。

## 設定 {#configuration}

`~/.hermes/config.yaml` の既定値は次のとおりです。

```yaml
secrets:
  bitwarden:
    enabled: false
    access_token_env: BWS_ACCESS_TOKEN
    project_id: ""
    server_url: ""
    cache_ttl_seconds: 300
    encrypted_cache:
      enabled: false
      max_stale_seconds: 0
    override_existing: true
    auto_install: true
```

| キー | 既定値 | 何をするか |
|---|---|---|
| `enabled` | `false` | 全体の切り替えです。false のあいだ、Bitwarden へは一切つなぎません。 |
| `access_token_env` | `BWS_ACCESS_TOKEN` | 最初のトークンを入れておく環境変数の名前です。`BWS_ACCESS_TOKEN` を別の用途ですでに使っているなら変えてください。 |
| `project_id` | `""` | 取り込み元のプロジェクトの UUID です。 |
| `server_url` | `""` | Bitwarden の地域、または自前ホストのエンドポイントです。空なら `bws` の既定（US Cloud、`https://vault.bitwarden.com`）になります。EU Cloud なら `https://vault.bitwarden.eu`、自前ホストなら自分の URL を設定します。`bws` のサブプロセスへ `BWS_SERVER_URL` として渡されます。 |
| `cache_ttl_seconds` | `300` | プロセス内やディスク上の取得結果を、どれだけの時間そのまま使い回すかです。`0` にすると、新しいキャッシュの再利用をしなくなります。 |
| `encrypted_cache.enabled` | `false` | 最後に成功した取得結果を、AES-GCM で暗号化したキャッシュとして `~/.hermes/cache/bws_cache.enc.json` に保存します。 |
| `encrypted_cache.max_stale_seconds` | `0` | 暗号化キャッシュを有効にしているとき、そのキャッシュを使えるのはネットワークの不調やタイムアウトのあとだけで、しかもここに設定した古さまでに限られます。認証の失敗では、古いシークレットが使われることはありません。暗号化された書き込みに成功すると、以前の平文の `cache/bws_cache.json` は削除されます。 |
| `override_existing` | `true` | true のとき、Bitwarden の値が環境にすでにある値を上書きします（Web アプリでの入れ替えが実際に効くようにするためです）。手元では `.env` やシェルの export を勝たせたいなら `false` にします。 |
| `auto_install` | `true` | true のとき、最初に使うタイミングで `bws` が `~/.hermes/bin/` へ自動でダウンロードされます。 |

## うまくいかないときの挙動 {#failure-modes}

Bitwarden が Hermes の起動を止めることはありません。何か問題が起きても、標準エラー出力に 1 行の警告が出るだけで、Hermes は `.env` にすでにあった認証情報のまま動き続けます。

| 症状 | 原因 | 対処 |
|---|---|---|
| `BWS_ACCESS_TOKEN is not set` | 設定では有効なのに、トークンが `.env` から消えている | `hermes secrets bitwarden setup` をやり直す |
| `Bitwarden rejected the machine-account access token … invalid_client` | トークンが失効した、期限が切れた、マシンアカウントが消えた。あるいはトークンが別の地域のもの（EU のトークンで US の認証エンドポイントを叩いた場合など） | `hermes secrets bitwarden token` を実行して新しいトークンを貼り付ける。地域の食い違いなら、設定をやり直して EU か自前ホストを選ぶ（または `secrets.bitwarden.server_url` を設定する） |
| `bws exited 1: invalid access token` | トークンが失効している、または間違っている | `hermes secrets bitwarden token` に新しいトークンを渡して実行する |
| `bws timed out` | ネットワークが遮断されている、または Bitwarden の API が遅い | `api.bitwarden.com`（あるいは設定した `server_url`）へつながるか確認する |
| `bws binary not available` | `auto_install: false` になっていて、`bws` が PATH にもない | [github.com/bitwarden/sdk-sm/releases](https://github.com/bitwarden/sdk-sm/releases) から手で入れるか、`auto_install` を元に戻す |
| `Checksum mismatch` | ダウンロードが壊れた、または改ざんされた | 実行し直せば再試行される。それでも続くなら issue を立てる |

起動時の警告には `→` から始まる対処の行が付き、どのコマンドで直せるかがそのまま書かれています。

## セキュリティ上の注意 {#security-notes}

- 最初のトークン（`BWS_ACCESS_TOKEN`）自体が秘密の情報です。これを持っている人は、そのマシンアカウントが読めるシークレットをすべて読めます。他の API キーと同じ扱いにしてください。
- Hermes は、`override_existing: true` であっても、Bitwarden にこの最初のトークン自体を上書きさせません。`BWS_ACCESS_TOKEN` をプロジェクト内のシークレットとして置いた場合、反映のときに黙って飛ばされます。
- `bws` の実行ファイルは、同じ GitHub リリースで公開されている SHA-256 のチェックサムと照合されます。食い違えば導入を中止します。
- 版は固定してあり（この文書を書いた時点では `bws v2.0.0`）、更新はこのリポジトリへの PR で行います。上流のリリースの形が変わることがあるので、Hermes が `bws` を勝手に「最新」へ上げることはありません。

## 使わないほうがよい場面 {#when-not-to-use-this}

- **1 台で個人的に使っている環境**で、`~/.hermes/.env` で十分な場合。認証情報を別の認証情報に置き換えただけで、起動時にネットワークへの依存が増えます。
- **閉じたネットワーク**で `api.bitwarden.com` に届かない場合。
- **CI/CD** で、すでにシークレットを流し込む仕組み（GitHub Actions のシークレット、Vault など）が整っている場合。経路は 2 つでなく 1 つに決めてください。

向いているのは、複数の端末をまとめて運用している場合、共用の開発機、ゲートウェイ用の VPS、そのほか複数の Hermes を入れた環境で、入れ替えと失効を一箇所で済ませたい場合です。
