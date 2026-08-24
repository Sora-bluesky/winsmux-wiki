---
title: "Hermes の Docker セットアップ"
description: "Hermes Agent を Docker で動かす方法と、Docker をターミナルのバックエンドとして使う方法"
upstream_path: user-guide/docker.md
upstream_blob: cf63f4f6ebfba714ac5f40d08082aff2331d11e8
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/docker
---

# Hermes の Docker セットアップ {#hermes-docker-setup}

Docker と Hermes Agent の関わり方には、はっきり異なる 2 通りがあります。

1. **Hermes を Docker のなかで動かす** — エージェント自体をコンテナのなかで動かします（このページで主に扱うのはこちらです）
2. **Docker をターミナルのバックエンドとして使う** — エージェント自体はホスト側で動きますが、すべてのコマンドは 1 つの Docker サンドボックスコンテナのなかで実行されます。このコンテナは Hermes プロセスが生きているあいだ、ツール呼び出しをまたいでも `/new` を実行してもサブエージェントを起こしても保持されます（[設定 → Docker バックエンド](/hermes/docs/user-guide/configuration/#docker-backend) をご覧ください）

このページで説明するのは 1 つめです。コンテナは利用者のデータ（設定、API キー、セッション、スキル、メモリ）をすべて、ホストから `/opt/data` にマウントした 1 つのディレクトリに保存します。イメージそのものは状態を持たないので、新しいバージョンを取得すれば設定を失わずに更新できます。

## まずは試す {#quick-start}

Hermes Agent を動かすのが初めてなら、ホストにデータ用のディレクトリを作り、対話モードでコンテナを起動してセットアップウィザードを実行します。

:::caution インストール用のコマンドをブラウザ版の VPS コンソールで打たないでください
VPS の事業者には、ホストを管理するためのブラウザ版コンソールを提供しているところがあります（Hetzner Cloud をはじめ、いくつもあります）。この種のコンソールは特殊文字を正しく送れません。`:` が `;` になって届いたり、`@` が化けたり、英語以外のキーボード配列だとさらにひどくなったりします。その結果、`-v ~/.hermes:/opt/data` や `-e KEY=value` のような `docker run` の引数や、貼り付けた API キーやトークンが、気づかないうちに壊れてしまいます。

**代わりに SSH で接続してください**（`ssh root@<host>`）。コピーと貼り付けが安全に使えます。どうしてもブラウザ版コンソールを使うのなら、貼り付けずに手で打ち込み、Enter を押す前に `:`、`@`、`=`、`/` をすべて見直してください。
:::

```sh
mkdir -p ~/.hermes
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent setup
```

これでセットアップウィザードが立ち上がり、API キーを尋ねられて、その内容が `~/.hermes/.env` に書き込まれます。この作業が必要なのは最初の一度だけです。この段階で、ゲートウェイと連携させるチャットのしくみもあわせて用意しておくことを強くおすすめします。

:::tip
コンテナのなかで `hermes setup --portal` を一度実行しておいてください。更新用のトークンは、マウントした `~/.hermes` ボリュームに残ります。[Nous Portal](/hermes/docs/integrations/nous-portal/) をご覧ください。
:::

## ゲートウェイとして動かす {#running-in-gateway-mode}

設定が済んだら、コンテナをバックグラウンドで動かして、常駐するゲートウェイ（Telegram、Discord、Slack、WhatsApp など）にします。

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  -p 8642:8642 \
  nousresearch/hermes-agent gateway run
```

ポート 8642 では、ゲートウェイの [OpenAI 互換 API サーバー](/hermes/docs/user-guide/features/api-server/) と稼働確認用のエンドポイントが公開されます。チャットのサービス（Telegram、Discord など）しか使わないのなら開けなくてもかまいませんが、ダッシュボードや外部のツールからゲートウェイに届かせたいのなら必要です。

:::tip ゲートウェイは見守られながら動きます
公式の Docker イメージのなかでは、`gateway run` は **s6-overlay によって自動的に見守られています**。ゲートウェイのプロセスが落ちても、コンテナごと巻き添えになることなく数秒で再起動します。ダッシュボード（`HERMES_DASHBOARD=1` を設定したとき）も同じしくみで見守られます。`gateway run` の CMD プロセス自体は `sleep infinity` による生存確認の役目で、コンテナを生かしたまま実際のゲートウェイプロセスは s6 が面倒を見ます。そのため `docker stop` でこれまでどおりきれいに全体を止められますが、`docker logs` に出てくるのは s6 が見守っているゲートウェイの出力です。

`docker logs` には、この動きに切り替わったことを示す 1 行の手がかりが出ます。この動きをやめて、以前の「ゲートウェイがコンテナの主プロセスで、コンテナの終了＝ゲートウェイの終了」という挙動に戻したいときは、`--no-supervise` を渡すか `HERMES_GATEWAY_NO_SUPERVISE=1` を設定します。この切り替えは、ゲートウェイの終了コードでコンテナを終わらせたい CI の簡易テストでは役に立ちますが、本番の運用では見守りありの既定のほうが確実に優れています。

この挙動は s6 版のイメージだけの話です。それ以前の（tini 版の）イメージでは、`gateway run` はこれまでどおり前面の主プロセスとして動きます。
:::

:::note ゲートウェイのログの行き先
どこに何が出るかの全体像は、後半の [ログの行き先](#where-the-logs-go) の節をご覧ください（プロファイルごとのゲートウェイ、ダッシュボード、起動時の復元処理、コンテナ全体の `docker logs`）。
:::

:::note 人が見ていないゲートウェイでのツール呼び出しの強制停止
`tool_loop_guardrails.hard_stop_enabled` の設定は既定で `false` です。人がツール呼び出しの警告を繰り返し目にできる対話型の CLI や TUI のセッションなら、これで妥当です。ただし人が見ていないゲートウェイやサーバーでの運用では、警告だけでは同じツール呼び出しを繰り返して抜け出せなくなったエージェントを止められないことがあります。安全装置として働かせたい運用者は、そのプロファイルの `config.yaml` で強制停止を明示的に有効にしてください。

```yaml
tool_loop_guardrails:
  hard_stop_enabled: true
  hard_stop_after:
    exact_failure: 5
    idempotent_no_progress: 5
```
:::

補足として、API サーバーは `API_SERVER_ENABLED=true` でなければ動きません。コンテナのなかの `127.0.0.1` の外まで公開するには、あわせて `API_SERVER_HOST=0.0.0.0` と `API_SERVER_KEY`（8 文字以上。`openssl rand -hex 32` で作れます）も設定します。例を挙げます。

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  -p 8642:8642 \
  -e API_SERVER_ENABLED=true \
  -e API_SERVER_HOST=0.0.0.0 \
  -e API_SERVER_KEY="$(openssl rand -hex 32)" \
  -e API_SERVER_CORS_ORIGINS='*' \
  nousresearch/hermes-agent gateway run
```

インターネットに面したマシンでポートを開けることには、どのポートであれ安全面の危険が伴います。その危険を理解していないのなら、開けるべきではありません。

## ダッシュボードを動かす {#running-the-dashboard}

内蔵の Web ダッシュボードは、同じコンテナのなかでゲートウェイと並んで、s6-rc に見守られるサービスとして動きます。立ち上げるには `HERMES_DASHBOARD=1` を設定します。

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  -p 8642:8642 \
  -p 9119:9119 \
  -e HERMES_DASHBOARD=1 \
  nousresearch/hermes-agent gateway run
```

ダッシュボードは s6 が見守っています。落ちても、`s6-supervise` が少し待ってから自動で再起動します。ダッシュボードの標準出力と標準エラー出力は `docker logs <container>` に流れます（接頭辞は付きません。ゲートウェイ自身の出力は、いまはプロファイルごとの s6-log のファイルに入るようになったので — 後半の [ログの行き先](#where-the-logs-go) をご覧ください — 2 つの流れが混ざりません）。

| 環境変数 | 説明 | 既定値 |
|---------------------|-------------|---------|
| `HERMES_DASHBOARD` | `1`（または `true` / `yes`）にすると、見守り付きのダッシュボードのサービスが有効になります | *(未設定 — サービスは登録されるが停止したまま)* |
| `HERMES_DASHBOARD_HOST` | ダッシュボードの HTTP サーバーが待ち受けるアドレス | `0.0.0.0` |
| `HERMES_DASHBOARD_PORT` | ダッシュボードの HTTP サーバーのポート | `9119` |
| `HERMES_DASHBOARD_INSECURE` | **非推奨、いまは何もしません。** 以前は認証の関門を素通りさせるものでしたが、2026 年 6 月の安全強化以降、認証を無効にする働きはありません。ループバック以外で待ち受ける場合、認証のしくみは必ず必要です | *(無視されます — 代わりに認証のしくみを設定してください)* |

コンテナのなかのダッシュボードは、既定で `0.0.0.0` で待ち受けます。そうでなければ、公開した `-p 9119:9119` のポートにホストから届きません。コンテナ内のループバックだけに限りたいとき（サイドカー構成やリバースプロキシ構成など）は、`HERMES_DASHBOARD_HOST=127.0.0.1` を設定します。

ダッシュボードの認証の関門は、次の 2 つがどちらも満たされたときに自動で働きます。

1. 待ち受けるアドレスがループバック以外である（コンテナのなかの既定である `0.0.0.0` など）、**かつ**
2. `DashboardAuthProvider` のプラグインが登録されている。

2 つめを満たす方法として、3 つが同梱されています。

- **ユーザー名とパスワード** — 信頼できるネットワークや VPN の内側にある、自分で立てた・社内の・自宅のコンテナには、これがいちばん手軽です。`HERMES_DASHBOARD_BASIC_AUTH_USERNAME` と `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` を設定します（再起動してもログイン状態を保ちたいなら `HERMES_DASHBOARD_BASIC_AUTH_SECRET` も）。インターネットに直接さらす用途には向きません。
- **OAuth（Nous Portal）** — サービスとして提供する場合や公開する場合に使います。`HERMES_DASHBOARD_OAUTH_CLIENT_ID` が設定されていれば、`dashboard_auth/nous` のしくみが働きます。
- **自前の OIDC** — 標準の OpenID Connect を使って、自分の ID 基盤で認証したい場合です。`HERMES_DASHBOARD_OIDC_ISSUER` と `HERMES_DASHBOARD_OIDC_CLIENT_ID` が設定されていれば、`dashboard_auth/self_hosted` のしくみが働きます。

どれを選んでも、この関門は保護された経路に届く前にログイン画面へ誘導します。3 つのしくみのすべては [Web ダッシュボード → 認証](/hermes/docs/user-guide/features/web-dashboard/#authentication-gated-mode) をご覧ください。

認証のしくみが 1 つも登録されておらず、待ち受けがループバック以外だった場合、ダッシュボードは **起動時に止まる側に倒れます**。足りない環境変数を名指しするエラーが出ます。公開されたアドレスで認証なしのダッシュボードを出す逃げ道は、もうありません。`HERMES_DASHBOARD_INSECURE=1` は非推奨で、いまは何もしません（警告を出して無視されます）。認証のしくみを設定するか、`HERMES_DASHBOARD_HOST=127.0.0.1` で待ち受けて SSH のトンネルや Tailscale 越しにダッシュボードへ届かせてください。

:::warning `--insecure` がなくなった理由
認証のない公開ダッシュボードは、2026 年 6 月の MCP 設定への侵入活動で入口として使われました。インターネットを走査するしくみが、さらされたダッシュボード（と OpenAI の API サーバー）に到達し、エージェントを操って SSH の鍵による裏口を仕込ませたのです。認証の関門は、ループバック以外で待ち受けるすべての場合に必須になりました。信頼できる LAN や自宅の機器なら、同梱のユーザー名とパスワードのしくみ（`HERMES_DASHBOARD_BASIC_AUTH_USERNAME` と `_PASSWORD`）が、追加の仕組みなしで条件を満たせる方法です。
:::

ダッシュボードを別のコンテナで動かすことも、そのコンテナがホストの PID と network の名前空間を共有していれば **できます**（たとえばリポジトリ自身の `docker-compose.yml` がそうしているように `network_mode: host` を使う場合です。その `dashboard` サービスをご覧ください）。ゲートウェイが生きているかどうかの判定にはゲートウェイのプロセスと PID の名前空間を共有している必要があるので、この制限にかかるのは、PID の名前空間を共有しないブリッジネットワークの独立したコンテナでダッシュボードを動かす場合だけです。

## 対話モードで動かす（CLI のチャット） {#running-interactively-cli-chat}

すでにあるデータディレクトリに対して、対話的なチャットのセッションを開くには次のようにします。

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent
```

動いているコンテナのなかで（たとえば Docker Desktop から）すでにターミナルを開いているのなら、次を実行するだけです。

```sh
/opt/hermes/.venv/bin/hermes
```

## 消えないボリューム {#persistent-volumes}

`/opt/data` のボリュームは、Hermes のすべての状態にとって唯一の正本です。ホストの `~/.hermes/` ディレクトリに対応していて、次のものが入っています。

| パス | 内容 |
|------|----------|
| `.env` | API キーと秘密情報 |
| `config.yaml` | Hermes のすべての設定 |
| `SOUL.md` | エージェントの人格と人物像 |
| `sessions/` | 会話の履歴 |
| `memories/` | 消えずに残るメモリの保管場所 |
| `skills/` | 導入したスキル |
| `home/` | Hermes のツールが起こす子プロセス（`git`、`ssh`、`gh`、`npm`、スキルの CLI）のための、プロファイルごとの HOME |
| `cron/` | 定期実行の定義 |
| `hooks/` | イベントに反応するフック |
| `logs/` | 実行時のログ |
| `skins/` | CLI の見た目の設定 |

### 書き換えられないインストール先 {#immutable-install-tree}

サービスとして提供されるイメージと公開されている Docker イメージでは、`/opt/hermes` がアプリケーションのインストール先です。ここは root の持ち物で、実行時の `hermes` ユーザーからは読み取り専用です。そのため、エージェントのやり取り、ゲートウェイのセッション、ダッシュボードの操作、そして通常の `docker exec hermes hermes ...` のコマンドから、中核のソースや同梱の `.venv`、`node_modules`、TUI 一式をその場で書き換えることはできません。

Hermes の書き換わる状態はすべて `/opt/data` の下に置きます。設定、`.env`、プロファイル、スキル、メモリ、セッション、ログ、ダッシュボードにアップロードしたもの、プラグイン、その他利用者が管理するファイルです。このイメージでは、実行時の `.pyc` の書き込みと、Hermes が必要になってから `/opt/hermes` へ依存関係を入れる動きも無効にしてあります。公開されたイメージで必要になる任意の依存関係は、イメージに焼き込むか、新しくイメージを組み直して入れてください。

サービスとして提供されるイメージと公開されているイメージでは、エージェントの自己改善は `/opt/data` の下のスキル、メモリ、プラグイン、設定に限られます。`/opt/hermes` の下にある中核のソースは書き換えられません。中核への変更はリポジトリへの PR で行い、イメージの更新として届けるものであって、動いているインストール先を直接いじって行うものではありません。

運用者が `/opt/data` の外にあるファイルを直したり調べたりする必要があるときは、意識して root のシェルを使ってください。`hermes` の中継役は通常、`docker exec hermes hermes ...` を実行時のユーザーに落とします。root としての振る舞いが明確に必要な一回限りの実行では、`HERMES_DOCKER_EXEC_AS_ROOT=1` を設定します。

`~` の下に資格情報を保存するスキルの CLI は、データボリュームの直下ではなく、子プロセスの HOME に対して初期設定する必要があります。たとえば [xurl スキル](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/) は OAuth の情報を `~/.xurl` に保存しますが、公式の Docker の配置では Hermes のツール呼び出しはこれを `/opt/data/home/.xurl` として読みます。そのため、xurl の認証を手作業で行うときは `HOME=/opt/data/home` を付けて実行し、`HOME=/opt/data/home xurl auth status` で確認してください。

:::warning
同じデータディレクトリに対して、Hermes の **ゲートウェイ** のコンテナを 2 つ同時に動かさないでください。セッションのファイルやメモリの保管場所は、同時に書き込まれることを想定していません。
:::

## 複数プロファイルへの対応 {#multi-profile-support}

Hermes は [複数のプロファイル](/hermes/docs/reference/profile-commands/) に対応しています。`~/.hermes/` の下の別々のサブディレクトリで、1 つのインストールから独立したエージェント（SOUL、スキル、メモリ、セッション、資格情報がそれぞれ別）を動かせるしくみです。**公式の Docker イメージのなかでは、s6 の見守りのしくみが各プロファイルを一人前のサービスとして扱います**。そのため、おすすめの構成は **1 つのコンテナですべてのプロファイルを抱える** 形です。

`hermes profile create <name>` で作った各プロファイルには、次のものが備わります。

- `/run/service/gateway-<name>/` にある専用の s6 サービスの枠。実行時に動的に登録されるので、コンテナを組み直す必要はありません。
- 落ちたときの自動再起動。待ち時間は `s6-supervise` が調整します。
- `${HERMES_HOME}/logs/gateways/<name>/current` にある、プロファイルごとの入れ替え式のログ（1 MB のものを 10 世代）。
- コンテナを再起動しても状態が残ること。起動時の復元処理が各プロファイルのディレクトリから `gateway_state.json` を読み、最後に記録された状態が `running` だったプロファイルの枠だけを立ち上げ直します。再起動をまたいで停止したままになるのは、自分で明示的に止めた（`hermes gateway stop`）ゲートウェイだけです。コンテナの再起動、イメージの更新、予期せぬ終了では記録上の状態が `running` のまま残るので、次の起動でゲートウェイは自動的に立ち上がります。

ホストで実行するのと同じ操作のコマンドが、コンテナのなかからも同じように使えます。

```sh
# Create a profile — registers the gateway-<name> s6 slot.
docker exec hermes hermes profile create coder

# Start / stop / restart — dispatches s6-svc; the gateway lifecycle survives docker restart.
docker exec hermes hermes -p coder gateway start
docker exec hermes hermes -p coder gateway stop
docker exec hermes hermes -p coder gateway restart

# Status — reports `Manager: s6 (container supervisor)` inside the container.
docker exec hermes hermes -p coder gateway status

# Remove a profile — tears down the s6 slot too.
docker exec hermes hermes profile delete coder
```

内部では、コンテナのなかの `hermes gateway start/stop/restart` は横取りされ、適切なサービスのディレクトリに対する `s6-svc` に振り分けられます。s6 のコマンドを直接覚える必要はありません。見守りのしくみの生の状態が知りたいときは `/command/s6-svstat /run/service/gateway-<name>` を使ってください（`/command/` が PATH に入っているのは見守りのしくみが起こしたプロセスだけなので、`docker exec` から呼ぶときは絶対パスで渡します）。

### コンテナの外から複数のプロファイルに届かせる {#reaching-more-than-one-profile-from-outside-the-container}

コンテナの外からプロファイルのゲートウェイに届く経路は 2 つあり、振る舞いも違います。混同しないでください。

**Hermes Desktop（と Web ダッシュボード）。** Desktop アプリの **Remote Gateway** の接続先は `hermes dashboard` のバックエンド（既定は **ポート 9119**、`HERMES_DASHBOARD=1` で有効）であって、OpenAI の API サーバー *ではありません*。1 つのダッシュボードのバックエンドが、同じ場所にある **すべての** プロファイルに応えます。アプリのプロファイル切り替えが対象のプロファイルをリクエストごとに送り、バックエンドがディスク上のそのプロファイルの `HERMES_HOME` を開きます。つまり Desktop では、プロファイルごとに 2 つめのポートも 2 つめの接続も **必要ありません**。`:9119` への 1 つの接続と切り替えだけで、すべてをまかなえます。

**OpenAI 互換の API クライアント（Open WebUI、LobeChat、`/v1/...`）。** こちらは各プロファイルの **API サーバー** と話します。API サーバーは **どのプロファイルでもポート 8642** で待ち受けます（`API_SERVER_PORT` か `platforms.api_server.extra.port` から決まります。自動での割り当てはなく、`config.yaml` の `gateway.port` というキーもありません）。クライアントから *特定の* 2 つめのプロファイルに届かせたいなら、そのプロファイル **自身の** `.env` で別の `API_SERVER_PORT` を指定してください。そうしないと、そのゲートウェイも 8642 を取ろうとして、既定のプロファイルとぶつかります。

```sh
# Create the profile (registers its gateway-<name> s6 slot)
docker exec hermes hermes profile create work

# Point its API server at a free port (write to the profile's own .env)
cat >> /opt/data/profiles/work/.env <<'EOF'
API_SERVER_ENABLED=true
API_SERVER_PORT=8643
EOF

docker exec hermes hermes -p work gateway restart
```

`API_SERVER_PORT` は各プロファイル **自身の** `.env` に置き、コンテナ全体の `environment:` の欄には決して書かないでください。全体に効く値を書くと、すべてのプロファイルが同じポートに追いやられてぶつかります。ブリッジネットワークを使うなら、追加のポートを `docker-compose.yml` で公開します（`- "8643:8643"`）。`network_mode: host` なら、すでにホストから届きます。既定のプロファイルの 8642 への接続はそのままです。

### 多数のコンテナではなく、1 つのコンテナに多数のプロファイルを置く理由 {#why-one-container-with-many-profiles-not-many-containers}

s6 へ移る前は、複数のゲートウェイを取りまとめる見守り役がコンテナのなかになかったため、「プロファイルごとに 1 つのコンテナ」がおすすめの形でした。s6 が PID 1 になったいま、それはもう必要なく、1 つのコンテナにまとめる形がほとんどの面で単純です。

| | 1 つのコンテナに多数のプロファイル | プロファイルごとに 1 つのコンテナ |
|---|---|---|
| ディスクの負担 | イメージ 1 つ、同梱の venv 1 つ、Playwright のキャッシュ 1 つ | N 個のイメージと N 個のキャッシュ |
| メモリの負担 | Python のインタプリタのキャッシュと node_modules を共有 | コンテナごとに重複 |
| プロファイルの作成 | `docker exec ... hermes profile create <name>`（数秒） | 新たな `docker run` の実行、ポートの割り当て、設定のバインドマウント |
| プロファイルごとの復旧 | `s6-supervise` による自動再起動 | Docker の `--restart unless-stopped`（遅く、隣で動いている作業も巻き添えにする） |
| ログ | `s6-log` によるプロファイルごとの入れ替え式のファイルと、コンテナ起動時の記録 | コンテナごとの `docker logs <name>` — 入れ替えのしくみはなし |
| バックアップ | `~/.hermes` ディレクトリ 1 つ | 足並みをそろえる必要のある N 個のディレクトリ |

既定のプロファイル（`default`）は最初の起動時に必ず登録されるので、新しいコンテナには見守り付きのゲートウェイが最初から 1 つ入っています。追加のプロファイルは、実行時に足すだけのものです。

### コンテナを分けたほうがよい場合 {#when-you-do-want-a-separate-container}

プロファイルをコンテナのなかに置くのが既定です。プロファイルごとにコンテナを分けるのは、はっきりした理由があるときだけにしてください。

- **処理ごとに資源を切り離したい** — たとえば、プロファイル A で暴走したブラウザのツールのセッションが、プロファイル B のメモリを食い潰さないようにしたい場合です。コンテナなら、プロファイルごとに `--memory` や `--cpus` を指定できます。
- **イメージの版を別々に固定したい** — 処理ごとに、上流のイメージのタグを変えたい場合です。
- **ネットワークを分けたい** — プロファイルごとに別々の Docker のネットワークを用意する場合です（たとえば一方はお客さま向け、もう一方は社内向け）。
- **法令順守や被害の範囲** — 別々の資格情報が、OS のプロセスの系統を共有しないようにする場合です。

そうした場合は、`container_name`、`volumes`、`ports` をそれぞれ分けて、プロファイルごとに 1 つのサービスを書きます。

```yaml
services:
  hermes-work:
    image: nousresearch/hermes-agent:latest
    container_name: hermes-work
    restart: unless-stopped
    command: gateway run
    ports:
      - "8642:8642"
    volumes:
      - ~/.hermes-work:/opt/data

  hermes-personal:
    image: nousresearch/hermes-agent:latest
    container_name: hermes-personal
    restart: unless-stopped
    command: gateway run
    ports:
      - "8643:8642"
    volumes:
      - ~/.hermes-personal:/opt/data
```

[消えないボリューム](#persistent-volumes) の警告はここでも生きています。2 つのコンテナを同じ `~/.hermes` ディレクトリに同時に向けないでください。各コンテナのなかの s6 の見守り役は、自分の持つプロファイルの一式を管理します。データのボリュームをコンテナをまたいで共有すると、セッションのファイルとメモリの保管場所が壊れます。

## ログの行き先 {#where-the-logs-go}

s6 のコンテナにはログの出口が 4 つあり、「なぜ `docker logs` にゲートウェイの様子が何も出ないのか」はよくある戸惑いです。早見表を示します。

| 出どころ | どこに出るか | 読み方 |
|---|---|---|
| **プロファイルごとのゲートウェイ**（`hermes gateway run` と、s6 の下で動くプロファイルごとのゲートウェイ） | 2 か所に同じ内容が流れます。`docker logs <container>`（そのとき、余計な接頭辞なし）**と** `${HERMES_HOME}/logs/gateways/<profile>/current`（入れ替え式、ISO-8601 の時刻付き、1 MB のものを 10 世代） | ホストで `docker logs -f hermes` または `tail -F ~/.hermes/logs/gateways/default/current` |
| **ダッシュボード**（`HERMES_DASHBOARD=1` のとき） | `docker logs <container>`（接頭辞なし） | `docker logs -f hermes` — ゲートウェイの行と混ざって出ます |
| **起動時の復元処理**（コンテナが起動するたびに、どのプロファイルのゲートウェイを戻したかを記録します） | `${HERMES_HOME}/logs/container-boot.log`（追記だけの記録） | `tail -F ~/.hermes/logs/container-boot.log` |
| **Hermes 全般のログ**（`agent.log`、`errors.log`） | `${HERMES_HOME}/logs/`（プロファイルを踏まえた場所） | `docker exec hermes hermes logs --follow [--level WARNING] [--session <id>]` |

実際に効いてくる点が 2 つあります。

- コンテナを再起動しても残るのは、`logs/gateways/<profile>/current` にあるファイルのほうです。`docker logs` が保持するのはいまのコンテナが生きているあいだの出力だけで（`docker rm` すると消えます）、入れ替え式のファイルはバインドマウントしたボリュームに残ります。
- 起動時の復元処理が残す記録の形は `<iso-timestamp> profile=<name> prior_state=<state> action=<registered|started>` です。そのため `grep profile=coder ~/.hermes/logs/container-boot.log` とさっと打つだけで、そのプロファイルが最後に戻されたのはいつか、s6 が自動で起動したのかどうかが分かります。

## 環境変数の受け渡し {#environment-variable-forwarding}

API キーは、コンテナのなかの `/opt/data/.env` から読まれます。環境変数として直接渡すこともできます。

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e OPENAI_API_KEY="sk-..." \
  nousresearch/hermes-agent
```

`-e` で直接渡した値は、`.env` の値より優先されます。キーをディスクに置きたくない CI/CD や秘密情報の管理サービスとの連携では、これが役に立ちます。

:::note Docker を **ターミナルのバックエンド** として使う話をお探しですか
このページで扱っているのは、Hermes 自体を Docker のなかで動かす話です。エージェントの `terminal` や `execute_code` の呼び出しを Docker のサンドボックスコンテナのなかで実行させたい場合は（Hermes のプロセスをまたいで共有される、長く生きる 1 つのコンテナです。issue #20561 をご覧ください）、それは別の設定の一式になります。`terminal.backend: docker` に加えて、`terminal.docker_image`、`terminal.docker_volumes`、`terminal.docker_forward_env`、`terminal.docker_env`、`terminal.docker_run_as_host_user`、`terminal.docker_extra_args`、`terminal.docker_persist_across_processes`、`terminal.docker_orphan_reaper` です。コンテナの寿命の決まりを含む全体は [設定 → Docker バックエンド](/hermes/docs/user-guide/configuration/#docker-backend) をご覧ください。
:::

## Docker Compose の例 {#docker-compose-example}

ゲートウェイとダッシュボードの両方を常駐させる形で動かすなら、`docker-compose.yaml` が便利です。

```yaml
services:
  hermes:
    image: nousresearch/hermes-agent:latest
    container_name: hermes
    restart: unless-stopped
    command: gateway run
    ports:
      - "8642:8642"   # gateway API
      - "9119:9119"   # dashboard (only reached when HERMES_DASHBOARD=1)
    volumes:
      - ~/.hermes:/opt/data
    environment:
      - HERMES_DASHBOARD=1
      # Uncomment to forward specific env vars instead of using .env file:
      # - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      # - OPENAI_API_KEY=${OPENAI_API_KEY}
      # - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2.0"
```

`docker compose up -d` で起動し、`docker compose logs -f` でログを見ます。見守られているゲートウェイの標準出力は、ボリューム上の `${HERMES_HOME}/logs/gateways/<profile>/current` にも同じ内容が流れます。どこに何が出るかの全体像は [ログの行き先](#where-the-logs-go) をご覧ください。

## 任意: Linux デスクトップの音声の橋渡し {#optional-linux-desktop-audio-bridge}

Docker で音声モードを動かすには、別々の 2 つのことが必要です。Hermes がコンテナのなかで音声機器を調べられること、そしてコンテナからホストの音声のしくみに届くことです。以下の手順では、PulseAudio 互換のソケットを持つ Linux デスクトップ（多くの PipeWire の構成を含みます）について、ホスト側の音声の配線を扱います。

:::caution
これは Linux デスクトップ向けの回避策であって、Docker Desktop 全般の機能ではありません。ホストの音声がすでに動いていて、Hermes のコンテナのなかで CLI の音声モードを使いたいときに役立ちます。それでも Hermes が `Running inside Docker container -- no audio devices` と言ってくる場合は、`PULSE_SERVER` / `PIPEWIRE_REMOTE` に対応した Docker 内の音声機器の検出を含むビルドを使ってください。
:::

まず、Compose のファイルの隣に ALSA の設定を作ります。

```conf title="asound.conf"
pcm.!default {
    type pulse
    hint {
        show on
        description "Default ALSA Output (PulseAudio)"
    }
}

pcm.pulse {
    type pulse
}

ctl.!default {
    type pulse
}
```

次に、ALSA の PulseAudio プラグインを入れた、小さな派生イメージを組み立てます。

```dockerfile title="Dockerfile.audio"
FROM nousresearch/hermes-agent:latest

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends libasound2-plugins \
    && rm -rf /var/lib/apt/lists/*
```

そのイメージを Compose で使い、ホストの利用者の PulseAudio のソケットと cookie を渡します。

```yaml
services:
  hermes:
    build:
      context: .
      dockerfile: Dockerfile.audio
    image: hermes-agent-audio
    container_name: hermes
    restart: unless-stopped
    command: gateway run
    volumes:
      - ~/.hermes:/opt/data
      - /run/user/${HERMES_UID}/pulse:/run/user/${HERMES_UID}/pulse
      - ~/.config/pulse/cookie:/tmp/pulse-cookie:ro
      - ./asound.conf:/etc/asound.conf:ro
    environment:
      - HERMES_UID=${HERMES_UID}
      - HERMES_GID=${HERMES_GID}
      - XDG_RUNTIME_DIR=/run/user/${HERMES_UID}
      - PULSE_SERVER=unix:/run/user/${HERMES_UID}/pulse/native
      - PULSE_COOKIE=/tmp/pulse-cookie
```

コンテナのプロセスが利用者ごとの音声のソケットに触れるよう、ホストの UID と GID を指定して起動します。

```sh
export HERMES_UID="$(id -u)"
export HERMES_GID="$(id -g)"
docker compose up -d --build
```

コンテナのなかから PortAudio に何が見えているかを確かめるには、次のようにします。

```sh
docker exec hermes /opt/hermes/.venv/bin/python -c "import sounddevice as sd; print(sd.query_devices())"
```

## 資源の上限 {#resource-limits}

Hermes のコンテナが必要とする資源はほどほどです。おすすめの下限を示します。

| 資源 | 最低 | 推奨 |
|----------|---------|-------------|
| メモリ | 1 GB | 2〜4 GB |
| CPU | 1 コア | 2 コア |
| ディスク（データのボリューム） | 500 MB | 2 GB 以上（セッションやスキルとともに増えます） |

いちばんメモリを使うのは、ブラウザの自動操作（Playwright / Chromium）です。ブラウザのツールが要らないのなら 1 GB で足ります。ブラウザのツールを使うのなら、少なくとも 2 GB は割り当ててください。

Docker で上限を設定します。

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  --memory=4g --cpus=2 \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

## Dockerfile が行っていること {#what-the-dockerfile-does}

公式のイメージは `debian:13.4` を土台にしていて、次のものを含みます。

- Python 3.13。焼き込む追加機能（`all`、`messaging`、Anthropic / Bedrock / Azure の認証、Hindsight、Matrix）向けの依存関係を `uv sync --frozen --no-install-project` でロックファイルからそろえたうえで、Hermes 自体を依存関係なしの編集可能な形で入れています。
- Node.js 26 と npm（ブラウザの自動操作、WhatsApp の橋渡し、TUI と Desktop の一式、ワークスペースの組み立て道具のため）
- Chromium 入りの Playwright（`npx playwright install --with-deps chromium --only-shell`）
- システムの道具として ripgrep、ffmpeg、git、`xz-utils`
- **`docker-cli`** — コンテナのなかで動くエージェントが、ホストの Docker のしくみを動かせるようにするためのものです（`/var/run/docker.sock` をバインドマウントすると使えます）。`docker build`、`docker run`、コンテナの中身の確認などに使えます。
- **`openssh-client`** — コンテナのなかから [SSH のターミナルのバックエンド](/hermes/docs/user-guide/configuration/#ssh-backend) を使えるようにします。SSH のバックエンドはシステムの `ssh` の実行ファイルを呼び出すので、これがないとコンテナでの導入では何も言わずに失敗していました。
- WhatsApp の橋渡し（`scripts/whatsapp-bridge/`）
- PID 1 としての **[`s6-overlay`](https://github.com/just-containers/s6-overlay) v3**（以前の `tini` に代わるものです）。ダッシュボードとプロファイルごとのゲートウェイを見守って落ちたら再起動し、残ってしまった子プロセスを片付け、シグナルを転送します。

このイメージは、実行時の `/opt/hermes` を書き換えられないインストール先として扱います。Docker のなかで使えるようにしたい任意の Python の追加機能、Node のワークスペース、TUI の資材は、イメージを組み立てるときに焼き込む必要があります。実行時に必要になってから入れる動きは無効にしてあるので、見守られているゲートウェイや `docker exec hermes …` のコマンドが、読み取り専用のソースの置き場に依存関係の成果物を書き戻そうとすることはありません。

コンテナの `ENTRYPOINT` は小さな振り分け役（`docker/entrypoint-dispatch.sh`）です。コンテナが PID 1 を持っている場合（通常の Docker や Podman）は s6-overlay の `/init` を実行し、以下で説明する見守りのしくみが一式そろいます。プラットフォームがイメージの入口を自前の PID 1 の初期化のしくみで包んでいる場合（Fly.io Machines、`docker run --init`、一部の Nomad や Kubernetes の構成）、`/init` は `s6-overlay-suexec: fatal: can only run as pid 1` で止まってしまうため、振り分け役は代わりに 2 段目の初期化を直接実行し、s6 を使わずに主要な包み役を実行します。この代替の経路でも、指定したコマンドは動きます。ただし、見守られるサービス（ダッシュボード、プロファイルごとのゲートウェイ）は使えません。

PID 1 の経路では、`/init` は次のように動きます。
1. `/etc/cont-init.d/01-hermes-setup`（＝ `docker/stage2-hook.sh`）を root として実行します。UID と GID の付け替え（任意）、ボリュームの持ち主の修正、最初の起動時の `.env` / `config.yaml` / `SOUL.md` の用意、`HERMES_SKIP_CONFIG_MIGRATION=1` でなければ対話なしでの設定の書式の移行、同梱スキルの同期を行います。
2. `/etc/cont-init.d/02-reconcile-profiles`（＝ `hermes_cli.container_boot`）を実行します。`$HERMES_HOME/profiles/<name>/` をたどり、プロファイルごとのゲートウェイの s6 サービスの枠を `/run/service/gateway-<profile>/` に作り直し、最後に記録された状態が `running` だったものだけを自動で起動します（[プロファイルごとのゲートウェイの見守り](#per-profile-gateway-supervision) をご覧ください）。
3. 固定の `main-hermes` と `dashboard` の s6-rc サービスを起動します。
4. コンテナの CMD を主要なプログラムとして実行します（`/opt/hermes/docker/main-wrapper.sh`）。これが、利用者が `docker run` に渡した引数を次のように振り分けます。
   - 引数なし → `hermes`（既定）
   - 最初の引数が PATH 上の実行ファイル（`sleep`、`bash` など）→ それを直接実行
   - それ以外 → `hermes <args>`（サブコマンドとしてそのまま渡す）
   この主要なプログラムが終わるとコンテナも終わり、その終了コードを返します。

:::warning s6 より前のイメージからの互換性のない変更
コンテナの ENTRYPOINT は `/usr/bin/tini` ではなく、`entrypoint-dispatch.sh` という振り分け役になりました（PID 1 のもとでは s6-overlay の `/init` に引き継ぎます）。文書に載っている 5 通りの `docker run` の使い方（引数なし、`chat -q "…"`、`sleep infinity`、`bash`、`--tui`）は、tini 版のイメージとまったく同じように動きます。下流で使っている包み役が tini 固有のシグナルの挙動や、`/usr/bin/tini --` の書き込みに依存していたのなら、以前のイメージのタグに固定してください。
:::

:::warning 権限の考え方
`/init`（または、同じ働きをする、2 段目の処理に引き継ぐ従来の `docker/entrypoint.sh` の中継役）をコマンドの連なりに残さないかぎり、イメージの入口を上書きしないでください。s6-overlay の `/init` は、最初の起動時にボリュームの持ち主を変えられるよう root として動き、そのあと `s6-setuidgid` を使って、見守られるすべてのサービスと主要なプログラムのために `hermes` ユーザーへ落とします。公式のイメージのなかで `hermes gateway run` を root として起動することは、既定では拒否されます。`/opt/data` に root の持ち物のファイルが残り、あとからダッシュボードやゲートウェイを起動できなくなる恐れがあるからです。その危険を承知のうえで受け入れるときだけ、`HERMES_ALLOW_ROOT_GATEWAY=1` を設定してください。
:::

### `docker exec` は自動的に `hermes` ユーザーに落ちます {#docker-exec-automatically-drops-to-the-hermes-user}

`docker exec hermes <cmd>` は、既定ではコンテナのなかで root として動きます。ただしこのイメージには `/opt/hermes/bin/hermes` という薄い中継役が入っていて（PATH のいちばん先にあります）、root からの呼び出しを見つけると `s6-setuidgid hermes` を通して自分を実行し直します。そのため `docker exec hermes login`、`docker exec hermes profile create …`、`docker exec hermes setup` などはすべて、UID 10000 の持ち物としてファイルを書きます。つまり、見守られているゲートウェイから読めるファイルになり、`--user` の指定を足す必要はありません。root 以外からの呼び出し（見守られているプロセス自身、`docker exec --user hermes`、コンテナのなかのカンバンのサブエージェント）は近道に入って venv の実行ファイルを直接実行するので、よく通る経路に余計な負担はかかりません。

root としての振る舞いを保った `docker exec` がどうしても必要なとき（調査のためのセッション、root だけが見られる状態の確認、root の持ち物になっている `/opt/data` の外のファイル）は、実行ごとに切り替えます。

```sh
docker exec -e HERMES_DOCKER_EXEC_AS_ROOT=1 hermes <cmd>
```

この中継役が受け付けるのは `1` / `true` / `yes` です（大文字と小文字は区別しません）。それ以外は — `=0` のような打ち間違いも含めて — 権限を落とす動きになるので、気づかないうちに切り替わってしまうことはありません。`s6-setuidgid` が使えない場合（s6-overlay を取り除いた独自のビルドなど）、この中継役は root としての実行を拒み、終了コード 126 で終わります。壊れた権限の仕組みを黙って見過ごすのではなく、はっきり表に出すためです。以前は、`docker exec hermes login` が `auth.json` を `root:root` として書いてしまい、見守られているゲートウェイの認証が、どのチャットのサービスからのメッセージでも壊れる落とし穴がありました。

### プロファイルごとのゲートウェイの見守り {#per-profile-gateway-supervision}

`hermes profile create <name>` で作った各プロファイルには、s6 に見守られるゲートウェイのサービスが `/run/service/gateway-<name>/` に自動で登録され、コンテナを再起動しても状態を保ったまま自動で立ち上がります。利用者側の進め方と操作のコマンドは、前半の [複数プロファイルへの対応](#multi-profile-support) をご覧ください。

**s6 より前のイメージと比べた、見守りの利点:**

- ゲートウェイが落ちても、`s6-supervise` が約 1 秒待ってから自動で再起動します。
- `HERMES_DASHBOARD=1` で有効にしたダッシュボードも、同じ見守りのしくみの下に置かれ、同じように自動で再起動します。
- `docker restart`、イメージの更新（`docker compose up -d --force-recreate`）、予期せぬ終了があっても、動いていたゲートウェイは保たれます。起動時の復元処理が `$HERMES_HOME/profiles/<name>/gateway_state.json` を読み、最後に記録された状態が `running` なら枠を立ち上げ直します。`stopped` が記録され、再起動をまたいでゲートウェイが停止したままになるのは、明示的に `hermes gateway stop` を実行したときだけです。再起動や更新のときにコンテナや s6 が送る SIGTERM は「まだ動いている」として扱われ、自動で立ち上がります。
- プロファイルごとのゲートウェイのログは `$HERMES_HOME/logs/gateways/<profile>/current` に残り（`s6-log` が入れ替えます）、復元処理が何をしたかは起動ごとに `$HERMES_HOME/logs/container-boot.log` に追記されます。どこに何が出るかの全体像は [ログの行き先](#where-the-logs-go) をご覧ください。

コンテナのなかで `hermes status` を実行すると、`Manager: s6 (container supervisor)` と表示されます。見守りのしくみの生の様子を見たいときは `/command/s6-svstat /run/service/gateway-<name>` を使ってください（`/command/` が PATH に入っているのは見守りのしくみが起こしたプロセスだけなので、`docker exec` から呼ぶときは絶対パスで渡します）。

## 更新する {#upgrading}

最新のイメージを取得して、コンテナを作り直します。データディレクトリはそのまま残り、
コンテナはゲートウェイを起動する前に、マウントされた `$HERMES_HOME/config.yaml` に対して
対話なしで設定の書式の移行を行います。
移行が必要な場合、Hermes はまず `config.yaml` と `.env` の隣に、
時刻の付いたバックアップを書き出します。

```sh
docker pull nousresearch/hermes-agent:latest
docker rm -f hermes
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

Docker Compose を使う場合は次のようにします。

```sh
docker compose pull
docker compose up -d
```

`HERMES_SKIP_CONFIG_MIGRATION=1` を設定するのは、新しいイメージに書き換えさせる前に、
保存された設定を自分で確認したり移行したりする必要があるときだけにしてください。

## スキルと資格情報のファイル {#skills-and-credential-files}

Docker を実行の場として使う場合（上で説明した方法ではなく、エージェントが Docker のサンドボックスのなかでコマンドを実行する場合です。[設定 → Docker バックエンド](/hermes/docs/user-guide/configuration/#docker-backend) をご覧ください）、Hermes はすべてのツール呼び出しで長く生きる 1 つのコンテナを使い回し、スキルのディレクトリ（`~/.hermes/skills/`）と、スキルが宣言している資格情報のファイルを、読み取り専用のボリュームとしてそのコンテナへ自動でバインドマウントします。スキルのスクリプト、ひな形、参考資料は、手作業の設定なしにサンドボックスのなかで使えます。そしてコンテナは Hermes のプロセスが生きているあいだ残るので、入れた依存関係や書いたファイルは、次のツール呼び出しでもそのまま使えます。

同じ同期は SSH と Modal のバックエンドでも行われます。スキルと資格情報のファイルは、コマンドを実行するたびに rsync か Modal のマウント API を通して送られます。

## コンテナに道具を追加する {#installing-more-tools-in-the-container}

公式のイメージには、選び抜かれた道具の一式が入っていますが（[Dockerfile が行っていること](#what-the-dockerfile-does) をご覧ください）、エージェントが使いたくなるすべての道具が最初から入っているわけではありません。おすすめの方法が 5 つあり、手間と長持ちする度合いの小さい順に並べます。

### npm や Python の道具 — `npx` か `uvx` を使う {#npm-or-python-tools-use-npx-or-uvx}

npm や PyPI に公開されている道具なら、`npx`（npm）か `uvx`（Python）で実行するよう Hermes に伝え、そのコマンドを消えないメモリに覚えておくよう指示します。設定のファイルや資格情報が必要な道具なら、それらを `/opt/data` の下に置くよう指示してください（たとえば `/opt/data/<tool>/config.yaml`）。

依存関係は必要になったときに取得され、コンテナが生きているあいだキャッシュされます。`/opt/data` の下に書いた設定は、バインドマウントしたホストのディレクトリにあるので、コンテナを再起動しても残ります。パッケージのキャッシュそのものは `docker rm` のあとに作り直されますが、`npx` と `uvx` は次にその道具を動かすときに、意識させずに取り直します。

### それ以外の道具（apt のパッケージ、実行ファイル） — 入れて覚えさせる {#other-tools-apt-packages-binaries-install-and-remember}

npm と PyPI の外にあるもの — `apt` のパッケージ、できあいの実行ファイル、イメージにまだ入っていない言語の実行環境 — については、入れ方を Hermes に伝え（たとえば `apt-get update && apt-get install -y <package>`）、そのコマンドを覚えておくよう指示します。その道具はコンテナが生きているあいだ残り、コンテナを再起動したあとで再びその道具が必要になったとき、Hermes は入れ直すコマンドを実行します。

これは、すぐ入れられて、たまにしか使わない道具に向いています。いつも使う道具には、次の方法のほうが向いています。

### 長持ちさせる — 派生イメージを組み立てる {#durable-installs-build-a-derived-image}

コンテナを起動したらすぐ、入れ直しの待ち時間なしで使えなければならない道具があるときは、`nousresearch/hermes-agent` を土台にして、その道具を層として入れた新しいイメージを組み立てます。

```dockerfile
FROM nousresearch/hermes-agent:latest

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends <your-package> \
    && rm -rf /var/lib/apt/lists/*
USER hermes
```

これを組み立てて、公式のイメージの代わりに使います。

```sh
docker build -t my-hermes:latest .
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  -p 8642:8642 \
  my-hermes:latest gateway run
```

入口のスクリプトと `/opt/data` の扱いはそのまま引き継がれるので、このページの残りの内容もそのまま当てはまります。上流の `nousresearch/hermes-agent` の新しい版を取得したら、イメージを組み直すのを忘れないでください。

### 込み入った道具や複数のサービスの組み合わせ — 隣にコンテナを立てる {#complex-tools-or-multi-service-stacks-run-a-sidecar-container}

自分でサービスを持ち込む道具（データベース、Web サーバー、キュー、画面のないブラウザの集まり）や、Hermes のコンテナのなかに置くには重すぎる道具は、共有の Docker のネットワーク上で別のコンテナとして動かします。Hermes は、ローカルの推論サーバーに届くのと同じやり方で、コンテナ名を使って隣のコンテナに届きます（[ローカルの推論サーバーにつなぐ](#connecting-to-local-inference-servers-vllm-ollama-etc) をご覧ください）。

```yaml
services:
  hermes:
    image: nousresearch/hermes-agent:latest
    container_name: hermes
    restart: unless-stopped
    command: gateway run
    ports:
      - "8642:8642"
    volumes:
      - ~/.hermes:/opt/data
    networks:
      - hermes-net

  my-tool:
    image: example/my-tool:latest
    container_name: my-tool
    restart: unless-stopped
    networks:
      - hermes-net

networks:
  hermes-net:
    driver: bridge
```

Hermes のコンテナのなかからは、隣のコンテナに `http://my-tool:<port>` で届きます（提供している通信方式に応じて変わります）。この形にすると、サービスごとに寿命、資源の上限、更新の間隔を切り離しておけますし、1 つの道具のためだけに必要な依存関係で Hermes のイメージを膨らませずに済みます。

### 広く役立つ道具 — issue か pull request を出す {#broadly-useful-tools-open-an-issue-or-pull-request}

多くの Hermes Agent の利用者にとって役立ちそうな道具なら、自分だけの派生イメージで抱え込むのではなく、上流に提供することを考えてみてください。[hermes-agent リポジトリ](https://github.com/NousResearch/hermes-agent) に issue か pull request を出して、その道具と使いどころを説明します。公式のイメージに取り込まれた道具は、すべての利用者の役に立ちますし、下流の fork を保守し続ける負担もなくなります。

## ローカルの推論サーバー（vLLM、Ollama など）につなぐ {#connecting-to-local-inference-servers-vllm-ollama-etc}

Hermes を Docker で動かしていて、推論サーバー（vLLM、Ollama、text-generation-inference など）もホストか別のコンテナで動いている場合、ネットワークまわりには気を配る必要があります。

### Docker Compose（おすすめ） {#docker-compose-recommended}

両方のサービスを同じ Docker のネットワークに置きます。これがいちばん確実な方法です。

```yaml
services:
  vllm:
    image: vllm/vllm-openai:latest
    container_name: vllm
    command: >
      --model Qwen/Qwen2.5-7B-Instruct
      --served-model-name my-model
      --host 0.0.0.0
      --port 8000
    ports:
      - "8000:8000"
    networks:
      - hermes-net
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  hermes:
    image: nousresearch/hermes-agent:latest
    container_name: hermes
    restart: unless-stopped
    command: gateway run
    ports:
      - "8642:8642"
    volumes:
      - ~/.hermes:/opt/data
    networks:
      - hermes-net

networks:
  hermes-net:
    driver: bridge
```

そのうえで `~/.hermes/config.yaml` では、ホスト名に **コンテナ名** を使います。

```yaml
model:
  provider: custom
  model: my-model
  base_url: http://vllm:8000/v1
  api_key: "none"
```

:::tip 押さえどころ
- ホスト名には **コンテナ名**（`vllm`）を使ってください。`localhost` や `127.0.0.1` は Hermes のコンテナ自身を指してしまいます。
- `model` の値は、vLLM に渡した `--served-model-name` と一致していなければなりません。
- `api_key` には、空でない任意の文字列を設定します（vLLM はこのヘッダーを求めますが、既定では中身を確かめません）。
- `base_url` の末尾にスラッシュを付け **ない** でください。
:::

### Compose を使わず docker run だけで動かす {#standalone-docker-run-no-compose}

推論サーバーが（Docker ではなく）ホストで直接動いている場合、macOS と Windows では `host.docker.internal` を、Linux では `--network host` を使います。

**macOS / Windows:**

```sh
docker run -d \
  --name hermes \
  -v ~/.hermes:/opt/data \
  -p 8642:8642 \
  nousresearch/hermes-agent gateway run
```

```yaml
# config.yaml
model:
  provider: custom
  model: my-model
  base_url: http://host.docker.internal:8000/v1
  api_key: "none"
```

**Linux（ホストのネットワークを使う場合）:**

```sh
docker run -d \
  --name hermes \
  --network host \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

```yaml
# config.yaml
model:
  provider: custom
  model: my-model
  base_url: http://127.0.0.1:8000/v1
  api_key: "none"
```

:::warning `--network host` を使うと `-p` の指定は無視され、コンテナのすべてのポートがそのままホストに出ます。
:::

### つながっているか確かめる {#verifying-connectivity}

Hermes のコンテナのなかから、推論サーバーに届くかどうかを確かめます。

```sh
docker exec hermes curl -s http://vllm:8000/v1/models
```

提供しているモデルが並んだ JSON の応答が返ってくるはずです。うまくいかない場合は、次を確かめてください。

1. 両方のコンテナが同じ Docker のネットワークにいるか（`docker network inspect hermes-net`）
2. 推論サーバーが `127.0.0.1` ではなく `0.0.0.0` で待ち受けているか
3. ポート番号が合っているか

### Ollama {#ollama}

Ollama も同じやり方で動きます。Ollama がホストで動いているなら、`host.docker.internal:11434`（macOS と Windows）か `127.0.0.1:11434`（Linux で `--network host` を使う場合）を指定します。Ollama が同じ Docker のネットワーク上の自分のコンテナで動いているなら、次のようにします。

```yaml
model:
  provider: custom
  model: llama3
  base_url: http://ollama:11434/v1
  api_key: "none"
```

## うまくいかないとき {#troubleshooting}

### コンテナがすぐ終了してしまう {#container-exits-immediately}

`docker logs hermes` でログを確かめます。よくある原因は次のとおりです。
- `.env` のファイルがない、または内容が正しくない — まず対話モードで動かして、セットアップを終わらせてください
- ポートを公開して動かしている場合の、ポートの衝突

### 「Permission denied」のエラー {#permission-denied-errors}

コンテナの 2 段目の処理は、見守られる各サービスのなかで `s6-setuidgid` を使い、root ではない `hermes` ユーザー（UID 10000）へ権限を落とします。ホストの `~/.hermes/` が別の UID の持ち物になっているなら、`HERMES_UID` と `HERMES_GID`（LinuxServer.io や NAS 向けのイメージに合わせた別名である `PUID` と `PGID` でもかまいません）をホストの利用者に合わせるか、データディレクトリに書き込めるようにしてください。

```sh
chmod -R 755 ~/.hermes
```

NAS（UGOS、Synology、unRAID）では、データディレクトリはたいてい **バインドマウント** で、コンテナからは `chown` できないホストの UID の持ち物になっています。`PUID` と `PGID`（または `HERMES_UID` と `HERMES_GID`）をそのホストの利用者に合わせて、UID 10000 ではなくマウント元の持ち主として動かしてください。

```sh
docker run -d \
  --name hermes \
  -e PUID=1000 -e PGID=10 \
  -v /volume1/docker/hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

`docker exec hermes <cmd>` も自動的に UID 10000 に落ちます。詳しい説明と実行ごとの切り替え方は [`docker exec` は自動的に `hermes` ユーザーに落ちます](#docker-exec-automatically-drops-to-the-hermes-user) をご覧ください。

### ブラウザのツールが動かない {#browser-tools-not-working}

Playwright には共有メモリが必要です。Docker の実行コマンドに `--shm-size=1g` を足してください。

```sh
docker run -d \
  --name hermes \
  --shm-size=1g \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

### ネットワークの不調のあと、ゲートウェイがつながり直さない {#gateway-not-reconnecting-after-network-issues}

`--restart unless-stopped` の指定が、一時的な不調のほとんどに対応します。ゲートウェイが固まってしまったときは、コンテナを再起動してください。

```sh
docker restart hermes
```

### コンテナの様子を確かめる {#checking-container-health}

```sh
docker logs --tail 50 hermes          # Recent logs
docker run -it --rm nousresearch/hermes-agent:latest version     # Verify version
docker stats hermes                    # Resource usage
```
