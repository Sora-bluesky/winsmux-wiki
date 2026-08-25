---
title: "Hermes の Docker での動かし方"
description: "Hermes Agent を Docker で動かす方法と、Docker をターミナルのバックエンドとして使う方法"
upstream_path: user-guide/docker.md
upstream_blob: 747e6b40edde70a5704b53e62ce4b8d89bf36756
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/docker
---

# Hermes の Docker での動かし方 {#hermes-docker-setup}

Docker と Hermes Agent の関わり方には、はっきり異なる2つがあります。

1. **Hermes を Docker の中で動かす** — エージェント自身をコンテナの中で動かします（このページで主に説明するのはこちらです）
2. **Docker をターミナルのバックエンドとして使う** — エージェントは手元のマシンで動きますが、コマンドはすべて1つの Docker のサンドボックスコンテナの中で実行されます。このコンテナは Hermes のプロセスが生きているあいだ、ツールの呼び出しをまたいでも `/new` をしてもサブエージェントを使っても残り続けます（[設定 → Docker バックエンド](/hermes/docs/user-guide/configuration/#docker-backend)を参照してください）

このページで扱うのは1つめです。コンテナはユーザーのデータ（設定、API キー、セッション、スキル、記憶）をすべて、ホスト側から `/opt/data` にマウントした1つのディレクトリに置きます。イメージ自体は状態を持たないので、新しいバージョンを取ってくるだけで、設定を失わずに上げられます。

## すぐ試す {#quick-start}

Hermes Agent を動かすのが初めてなら、ホスト側にデータ用のディレクトリを作り、対話モードでコンテナを起動して設定ウィザードを走らせてください。

:::caution インストールのコマンドをブラウザ上の VPS コンソールで打たないでください
VPS の事業者の中には（Hetzner Cloud をはじめ、いくつかあります）、ホストを管理するための
ブラウザ上のコンソールを提供しているところがあります。こうしたコンソールは特殊な文字を
正しく送れません。`:` が `;` になって届いたり、`@` が化けたり、英語以外の
キーボード配列だともっとひどいことになります。その結果、`docker run` の引数、たとえば
`-v ~/.hermes:/opt/data` や `-e KEY=value`、貼り付けた API キーやトークンが、
気づかないうちに壊れます。

**代わりに SSH でつないでください**（`ssh root@<host>`）。コピーと貼り付けが安全に
できます。どうしてもブラウザのコンソールを使うなら、貼り付けずに手で打ち込み、
Enter を押す前に結果の `:`、`@`、`=`、`/` をすべて見直してください。
:::

```sh
mkdir -p ~/.hermes
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent setup
```

これで設定ウィザードが開きます。ウィザードは API キーを尋ね、`~/.hermes/.env` に書き込みます。この作業が必要なのは一度だけです。この時点で、ゲートウェイが相手にするチャットの仕組みも合わせて設定しておくことを強くおすすめします。

:::tip
コンテナの中で `hermes setup --portal` を一度実行しておいてください。更新用のトークンはマウントした `~/.hermes` のボリュームに残ります。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

## ゲートウェイとして動かす {#running-in-gateway-mode}

設定が済んだら、コンテナを裏で動かし続けるゲートウェイとして起動します（Telegram、Discord、Slack、WhatsApp などが相手になります）。

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  -p 8642:8642 \
  nousresearch/hermes-agent gateway run
```

8642 番ポートは、ゲートウェイの [OpenAI 互換の API サーバー](/hermes/docs/user-guide/features/api-server/)と稼働確認用のエンドポイントを公開します。チャットのプラットフォーム（Telegram、Discord など）しか使わないなら開けなくても構いませんが、ダッシュボードや外部のツールからゲートウェイに届かせたいなら必要です。

:::tip ゲートウェイは見守られながら動きます
公式の Docker イメージの中では、`gateway run` は **s6-overlay によって自動的に見守られています**。ゲートウェイのプロセスが落ちても、コンテナごと落ちることなく数秒で再起動します。`HERMES_DASHBOARD=1` が設定されているときは、ダッシュボードも同じように見守られます。`gateway run` の CMD のプロセス自身は `sleep infinity` の鼓動役で、コンテナを生かしておくだけです。実際のゲートウェイのプロセスは s6 が面倒を見ます。ですから `docker stop` はこれまでどおり全体をきれいに止めますが、`docker logs` に出るのは見守られている側のゲートウェイの出力です。

`docker logs` には、この仕組みに切り替わったことを知らせる1行が出ます。使いたくない場合 — つまり「ゲートウェイがコンテナの主プロセスで、コンテナの終了＝ゲートウェイの終了」という従来の動きに戻したい場合 — は、`--no-supervise` を渡すか `HERMES_GATEWAY_NO_SUPERVISE=1` を設定してください。この打ち消しが役に立つのは、コンテナにゲートウェイの終了コードで終わってほしい CI の簡易テストなどです。本番の運用では、見守られる既定の動きのほうが明らかに優れています。

この動きは s6 を使ったイメージだけのものです。それより前の（tini を使った）イメージでは、`gateway run` は今も前面の主プロセスとして動きます。
:::

:::note ゲートウェイのログの行き先
プロファイルごとのゲートウェイ、ダッシュボード、起動時の調整役、コンテナ全体の `docker logs` を含めた行き先の全体像は、下の [ログはどこに出るか](#where-the-logs-go)の節を参照してください。
:::

:::note 人が見ていないゲートウェイでのツールのループの強制停止
`tool_loop_guardrails.hard_stop_enabled` の設定は初期値が `false` です。人が繰り返しのツール呼び出しの警告を目にできる、対話的な CLI や TUI のセッションではこれで問題ありません。しかし人が見ていないゲートウェイやサーバーでの運用では、警告だけでは、同じツールの呼び出しを繰り返して抜け出せなくなったエージェントを止められないことがあります。安全装置として強制的に止めたい場合は、プロファイルの `config.yaml` ではっきり有効にしてください。

```yaml
tool_loop_guardrails:
  hard_stop_enabled: true
  hard_stop_after:
    exact_failure: 5
    idempotent_no_progress: 5
```
:::

補足として、API サーバーは `API_SERVER_ENABLED=true` がないと動きません。コンテナの中の `127.0.0.1` を越えて公開するには、`API_SERVER_HOST=0.0.0.0` と `API_SERVER_KEY`（8文字以上。`openssl rand -hex 32` で作れます）も設定してください。例を挙げます。

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

インターネットに面したマシンでポートを開けることは、それだけでセキュリティ上の危険を伴います。危険を理解していないなら、開けるべきではありません。

## ダッシュボードを動かす {#running-the-dashboard}

組み込みのウェブのダッシュボードは、同じコンテナの中でゲートウェイと並んで、s6-rc に見守られるサービスとして動きます。立ち上げるには `HERMES_DASHBOARD=1` を設定します。

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

ダッシュボードは s6 に見守られています。落ちても `s6-supervise` が少し待ってから自動で再起動します。ダッシュボードの標準出力と標準エラー出力は `docker logs <container>` に流れます（接頭辞は付きません。ゲートウェイ自身の出力は、いまはプロファイルごとの s6-log のファイルに入ります — 下の [ログはどこに出るか](#where-the-logs-go)を参照してください — ので、2つの流れがぶつかることはありません）。

| 環境変数 | 説明 | 初期値 |
|---------------------|-------------|---------|
| `HERMES_DASHBOARD` | `1`（または `true` / `yes`）にすると、見守られるダッシュボードのサービスが有効になります | *(未設定 — サービスは登録されるが起動しない)* |
| `HERMES_DASHBOARD_HOST` | ダッシュボードの HTTP サーバーが待ち受けるアドレス | `0.0.0.0` |
| `HERMES_DASHBOARD_PORT` | ダッシュボードの HTTP サーバーのポート | `9119` |
| `HERMES_DASHBOARD_INSECURE` | **非推奨・何もしません。** 以前は認証の関門を素通りさせるものでしたが、2026年6月の安全強化以降、認証を無効にすることはなくなりました。ループバック以外に割り当てる場合は、必ず認証プロバイダーが必要です | *(無視されます — 代わりにプロバイダーを設定してください)* |

コンテナの中のダッシュボードは、初期状態で `0.0.0.0` に割り当てられます。そうでないと、公開した `-p 9119:9119` のポートにホストから届きません。コンテナのループバックだけに絞りたい場合（サイドカーやリバースプロキシと組み合わせる構成など）は、`HERMES_DASHBOARD_HOST=127.0.0.1` を設定してください。

ダッシュボードの認証の関門は、次の2つが両方とも成り立つときに自動で働きます。

1. 割り当て先がループバック以外であること（コンテナの中の初期値である `0.0.0.0` などです）。**そして**
2. `DashboardAuthProvider` のプラグインが登録されていること。

2つめを満たす方法は、はじめから3つ用意されています。

- **ユーザー名とパスワード** — 信頼できるネットワークの中や VPN の後ろで、自分で立てた社内や自宅のコンテナを使う場合にいちばん簡単です。`HERMES_DASHBOARD_BASIC_AUTH_USERNAME` と `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` を設定します（再起動してもセッションを保ちたいなら `HERMES_DASHBOARD_BASIC_AUTH_SECRET` も設定します）。インターネットに直接さらす用途には向きません。
- **OAuth（Nous Portal）** — ホスト型や一般公開の構成向けです。`HERMES_DASHBOARD_OAUTH_CLIENT_ID` が設定されていれば `dashboard_auth/nous` のプロバイダーが有効になります。
- **自前の OIDC** — 標準の OpenID Connect を使って、自分の認証基盤で認証します。`HERMES_DASHBOARD_OIDC_ISSUER` と `HERMES_DASHBOARD_OIDC_CLIENT_ID` が設定されていれば `dashboard_auth/self_hosted` のプロバイダーが有効になります。

どれを選んでも、関門は保護された経路にたどり着く前に、呼び出し元をログイン画面へ送ります。3つのプロバイダーすべてについては [ウェブのダッシュボード → 認証](/hermes/docs/user-guide/features/web-dashboard/#authentication-gated-mode)を参照してください。

プロバイダーが1つも登録されておらず、割り当て先がループバック以外の場合、ダッシュボードは**起動の時点で安全側に倒れて止まります**。足りない環境変数を名指しするエラーが出ます。公開された割り当て先で認証なしのダッシュボードを出す抜け道は、もうありません。`HERMES_DASHBOARD_INSECURE=1` はいまや非推奨で何もしません（警告を残して無視されます）。プロバイダーを設定するか、`HERMES_DASHBOARD_HOST=127.0.0.1` に割り当てて SSH のトンネルや Tailscale 越しにダッシュボードへ届かせてください。

:::warning `--insecure` がなくなった理由
認証のない公開ダッシュボードは、2026年6月に起きた MCP の設定を書き換えて居座る攻撃の入り口でした。インターネットを走査する側がさらされたダッシュボード（と OpenAI の API サーバー）にたどり着き、エージェントを操って SSH の鍵による裏口を仕込ませたのです。認証の関門は、ループバック以外に割り当てるすべての場合で必須になりました。信頼できる LAN の中や自宅のマシンなら、はじめから用意されているユーザー名とパスワードのプロバイダー（`HERMES_DASHBOARD_BASIC_AUTH_USERNAME` と `_PASSWORD`）が、追加の仕組みなしで条件を満たす方法です。
:::

ダッシュボードを別のコンテナで動かすことは、そのコンテナがホストの PID とネットワークの名前空間を共有していれば**できます**（たとえば `network_mode: host` にする方法で、このリポジトリ自身の `docker-compose.yml` もそうしています — その `dashboard` のサービスを見てください）。ゲートウェイが生きているかどうかの判定には、ゲートウェイのプロセスと PID の名前空間を共有している必要があります。ですからこの制限が当てはまるのは、PID の名前空間を共有しない、独立したブリッジネットワークのコンテナでダッシュボードを動かす場合だけです。

## 対話モードで動かす（CLI でのチャット） {#running-interactively-cli-chat}

すでにあるデータのディレクトリを相手に、対話的なチャットのセッションを開くには次のようにします。

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent
```

すでに動いているコンテナの中でターミナルを開いているなら（Docker Desktop などから）、次のコマンドだけで済みます。

```sh
/opt/hermes/.venv/bin/hermes
```

## データを残すボリューム {#persistent-volumes}

`/opt/data` のボリュームは、Hermes のすべての状態にとって唯一の正本です。ホスト側の `~/.hermes/` ディレクトリに対応していて、次のものが入っています。

| パス | 中身 |
|------|----------|
| `.env` | API キーと秘密の情報 |
| `config.yaml` | Hermes のすべての設定 |
| `SOUL.md` | エージェントの人格や人物像 |
| `sessions/` | 会話の履歴 |
| `memories/` | 残り続ける記憶の置き場 |
| `skills/` | 導入したスキル |
| `home/` | Hermes のツールが起動する子プロセス（`git`、`ssh`、`gh`、`npm`、スキルの CLI）のための、プロファイルごとの HOME |
| `cron/` | 予定して動かすジョブの定義 |
| `hooks/` | イベントのフック |
| `logs/` | 実行時のログ |
| `skins/` | CLI の自作の見た目 |

### 書き換えられないインストール先 {#immutable-install-tree}

ホスト型や公開されている Docker のイメージでは、`/opt/hermes` がアプリケーションを入れた場所です。ここは root が所有していて、実行時の `hermes` ユーザーからは読み取り専用です。ですからエージェントのやり取り、ゲートウェイのセッション、ダッシュボードの操作、ふつうの `docker exec hermes hermes ...` のコマンドから、中核のソースや同梱の `.venv`、`node_modules`、TUI の一式をその場で書き換えることはできません。

書き換わる Hermes の状態は、すべて `/opt/data` の下に置かれます。設定、`.env`、プロファイル、スキル、記憶、セッション、ログ、ダッシュボードにアップロードしたもの、プラグイン、そのほかユーザーが管理するファイルです。イメージは実行時の `.pyc` の書き出しと、Hermes が必要になったときに依存を `/opt/hermes` へ入れる動きも止めています。公開イメージで必要になる任意のプラットフォーム依存は、イメージに焼き込むか、新しいイメージを作り直すときに入れてください。

ホスト型や公開されているイメージでは、エージェントの自己改善が及ぶ範囲は `/opt/data` の下にあるスキル、記憶、プラグイン、設定に限られます。`/opt/hermes` の下にある中核のソースは書き換えられません。中核の変更はリポジトリへの PR として行い、イメージを更新することで届けます。動いているインストール先をその場で書き換える形は取りません。

`/opt/data` の外にあるファイルを直したり調べたりする必要があるときは、意図して root のシェルを使ってください。`hermes` のラッパーは、ふつう `docker exec hermes hermes ...` を実行時のユーザーに落とします。root として動かす必要がはっきりあるその一回だけ、`HERMES_DOCKER_EXEC_AS_ROOT=1` を設定してください。

`~` の下に認証情報を置くスキルの CLI は、データのボリュームの根元ではなく、子プロセスの HOME を相手に初期化する必要があります。たとえば [xurl のスキル](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/)は OAuth の状態を `~/.xurl` に置きますが、公式の Docker の配置では Hermes のツールの呼び出しはそれを `/opt/data/home/.xurl` として読みます。ですから xurl の認証を手で行うときは `HOME=/opt/data/home` を付けて実行し、`HOME=/opt/data/home xurl auth status` で確かめてください。

:::warning
同じデータのディレクトリに対して、Hermes の**ゲートウェイ**のコンテナを2つ同時に動かしてはいけません。セッションのファイルと記憶の置き場は、同時に書き込まれることを想定していません。
:::

## 複数のプロファイルへの対応 {#multi-profile-support}

Hermes は[複数のプロファイル](/hermes/docs/reference/profile-commands/)に対応しています。`~/.hermes/` の下に分かれたサブディレクトリで、1つのインストールから独立したエージェント（SOUL、スキル、記憶、セッション、認証情報がそれぞれ別）を動かせます。**公式の Docker のイメージの中では、s6 の見守りの仕組みが各プロファイルを一人前のサービスとして扱います**。そのため、おすすめの構成は**1つのコンテナですべてのプロファイルを抱える**形です。

`hermes profile create <name>` で作った各プロファイルには、次のものが用意されます。

- `/run/service/gateway-<name>/` にある専用の s6 のサービス枠。実行時に動的に登録されるので、コンテナを作り直す必要はありません。
- 落ちたときの自動再起動。待ち時間の調整は `s6-supervise` が行います。
- `${HERMES_HOME}/logs/gateways/<name>/current` にある、プロファイルごとの入れ替わるログ（1 MB のものを10世代分）。
- コンテナを再起動しても残る状態。起動時の調整役が各プロファイルのディレクトリから `gateway_state.json` を読み、最後に記録された状態が `running` だったプロファイルの枠だけを立ち上げ直します。再起動をまたいで止まったままになるのは、自分ではっきり停止した（`hermes gateway stop`）ゲートウェイだけです。コンテナの再起動、イメージの更新、思わぬ終了では記録された状態は `running` のままなので、次の起動でゲートウェイは自動的に立ち上がります。

ホスト側で実行するのと同じ操作のコマンドが、コンテナの中からも同じように使えます。

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

内側では、コンテナの中での `hermes gateway start/stop/restart` は横取りされ、正しいサービスのディレクトリを相手にした `s6-svc` へ回されます。s6 のコマンドを直接覚える必要はありません。見守り役の生の状態を見たいときは `/command/s6-svstat /run/service/gateway-<name>` を使ってください（`/command/` が PATH に入るのは、見守りの仕組みが起動したプロセスだけです。`docker exec` から呼ぶときは絶対パスを渡してください）。

### コンテナの外から複数のプロファイルに届かせる {#reaching-more-than-one-profile-from-outside-the-container}

外からプロファイルのゲートウェイに届く経路は2つあり、それぞれ動きが違います。混同しないでください。

**Hermes Desktop（およびウェブのダッシュボード）。** デスクトップアプリの **Remote Gateway** の接続が話す相手は `hermes dashboard` のバックエンド（初期値は **9119 番ポート**。`HERMES_DASHBOARD=1` で有効になります）であって、OpenAI の API サーバーでは *ありません*。1つのダッシュボードのバックエンドが、同じ場所にある**すべての**プロファイルに応対します。アプリのプロファイル切り替えが、どのプロファイル宛かをリクエストごとに送り、バックエンドがディスク上のそのプロファイルの `HERMES_HOME` を開きます。ですからデスクトップ版のために、プロファイルごとに2つめのポートや2つめの接続を用意する必要は**ありません**。`:9119` への接続1つで、切り替えを通してすべてがまかなえます。

**OpenAI 互換の API のクライアント（Open WebUI、LobeChat、`/v1/...`）。** こちらは各プロファイルの **API サーバー**と話します。API サーバーは**どのプロファイルでも 8642 番ポート**に割り当てられます（`API_SERVER_PORT` や `platforms.api_server.extra.port` から決まります。自動で空きを割り当てる仕組みはなく、`config.yaml` の `gateway.port` のような設定もありません）。クライアントから *特定の* 2つめのプロファイルに届かせたいなら、そのプロファイル**自身**の `.env` に別の `API_SERVER_PORT` を書いてください。そうしないと、そのゲートウェイも 8642 に割り当てようとして、既定のプロファイルとぶつかります。

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

`API_SERVER_PORT` は各プロファイル**自身**の `.env` に置いてください。コンテナ全体の `environment:` のまとまりには決して書かないでください。全体に効く値にすると、すべてのプロファイルが同じポートに集まってぶつかります。ブリッジのネットワークを使うなら、追加のポートを `docker-compose.yml` で公開します（`- "8643:8643"`）。`network_mode: host` なら、すでにホストから届きます。既定のプロファイルの 8642 への接続はそのままです。

### コンテナを分けずに、1つで複数のプロファイルを抱える理由 {#why-one-container-with-many-profiles-not-many-containers}

s6 に移る前は、コンテナの中に複数のゲートウェイを面倒みる仕組みがなかったので、「プロファイルごとに1コンテナ」がおすすめの形でした。s6 が PID 1 になったいま、それはもう必要ありません。1コンテナの構成のほうが、ほとんどすべての面で簡単です。

| | 1コンテナに複数プロファイル | プロファイルごとに1コンテナ |
|---|---|---|
| ディスクの消費 | イメージ1つ、同梱の venv 1つ、Playwright のキャッシュ1つ | イメージ N 個 / キャッシュ N 個 |
| メモリの消費 | Python のインタプリタのキャッシュと node_modules を共有 | コンテナごとに重複 |
| プロファイルの作成 | `docker exec ... hermes profile create <name>`（数秒） | 新しい `docker run` の実行 + ポートの割り当て + 設定のバインドマウント |
| プロファイルごとの復旧 | `s6-supervise` による自動再起動 | Docker の `--restart unless-stopped`（遅く、隣の作業も巻き込む） |
| ログ | `s6-log` によるプロファイルごとの入れ替わるファイルと、コンテナ起動時の記録 | コンテナごとの `docker logs <name>` — 入れ替えの仕組みはなし |
| バックアップ | `~/.hermes` のディレクトリ1つ | 足並みをそろえる必要のあるディレクトリ N 個 |

既定のプロファイル（`default`）は最初の起動で必ず登録されるので、新しいコンテナには最初から見守られるゲートウェイが1つあります。追加のプロファイルは、実行時に足すだけのものです。

### コンテナを分けたほうがよい場合 {#when-you-do-want-a-separate-container}

コンテナの中にプロファイルを置くのが既定です。プロファイルごとにコンテナを分けるのは、はっきりした理由があるときだけにしてください。

- **仕事ごとに資源を隔てたい** — たとえばプロファイル A で暴走したブラウザのツールのセッションが、プロファイル B のメモリを食いつぶさないようにしたい場合です。コンテナならプロファイルごとに `--memory` や `--cpus` を決められます。
- **イメージのバージョンを別々に固定したい** — 仕事ごとに違う上流のイメージのタグを使う場合です。
- **ネットワークを分けたい** — プロファイルごとに別の Docker のネットワークを使う場合です（たとえば片方は顧客向け、もう片方は社内向け）。
- **法令対応や被害範囲の限定** — 別々の認証情報が、OS のプロセスの木を共有しないようにしたい場合です。

そうした場合は、`container_name`、`volumes`、`ports` を別々にして、プロファイルごとに1つのサービスを書きます。

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

[データを残すボリューム](#persistent-volumes)の警告はここでも当てはまります。2つのコンテナを同じ `~/.hermes` のディレクトリに同時に向けてはいけません。それぞれのコンテナの中の s6 の見守り役は自分のプロファイルの集まりを管理するので、データのボリュームをコンテナ間で共有すると、セッションのファイルと記憶の置き場が壊れます。

## ログはどこに出るか {#where-the-logs-go}

s6 のコンテナには、はっきり異なる4つのログの出口があります。「`docker logs` にゲートウェイの様子が何も出ないのはなぜか」は、よくある戸惑いです。早見表を挙げます。

| 出どころ | どこに出るか | 読み方 |
|---|---|---|
| **プロファイルごとのゲートウェイ**（`hermes gateway run` と、s6 の下で動くプロファイルごとのゲートウェイ） | 2か所に同時に出ます。`docker logs <container>`（そのときすぐ見えます。余分な接頭辞は付きません）**と** `${HERMES_HOME}/logs/gateways/<profile>/current`（入れ替わる形式。ISO-8601 の時刻付きで、1 MB のものを10世代分） | ホストで `docker logs -f hermes` か `tail -F ~/.hermes/logs/gateways/default/current` |
| **ダッシュボード**（`HERMES_DASHBOARD=1` のとき） | `docker logs <container>`（接頭辞なし） | `docker logs -f hermes` — ゲートウェイの行と混ざって出ます |
| **起動時の調整役**（コンテナが起動するたびに、どのプロファイルのゲートウェイを戻したかを記録します） | `${HERMES_HOME}/logs/container-boot.log`（追記だけの記録） | `tail -F ~/.hermes/logs/container-boot.log` |
| **Hermes 全般のログ**（`agent.log`、`errors.log`） | `${HERMES_HOME}/logs/`（プロファイルを見分けます） | `docker exec hermes hermes logs --follow [--level WARNING] [--session <id>]` |

知っておくと役に立つ、実際の帰結が2つあります。

- コンテナの再起動をまたいで残るのは、`logs/gateways/<profile>/current` にあるファイルのほうです。`docker logs` が持っているのは、いまのコンテナが生きているあいだの出力だけで（`docker rm` すると消えます）、入れ替わるファイルのほうはバインドマウントしたボリュームの上に残ります。
- 起動時の調整役が残す記録は `<iso-timestamp> profile=<name> prior_state=<state> action=<registered|started>` という形です。ですから `grep profile=coder ~/.hermes/logs/container-boot.log` とすれば、そのプロファイルが最後にいつ戻され、s6 が自動で起動したかどうかがすぐ分かります。

## 環境変数の受け渡し {#environment-variable-forwarding}

API キーは、コンテナの中の `/opt/data/.env` から読まれます。環境変数を直接渡すこともできます。

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e OPENAI_API_KEY="sk-..." \
  nousresearch/hermes-agent
```

`-e` で直接渡した値は、`.env` の値より優先されます。キーをディスクに置きたくない CI/CD や、秘密情報の管理サービスと組み合わせるときに便利です。

:::note Docker を**ターミナルのバックエンド**として使いたい場合は
このページで扱っているのは、Hermes 自身を Docker の中で動かす話です。エージェントの `terminal` や `execute_code` の呼び出しを Docker のサンドボックスのコンテナの中で実行させたい場合（Hermes のプロセスをまたいで共有される、長く生きる1つのコンテナです — issue #20561 を参照してください）、それは別の設定のまとまりになります。`terminal.backend: docker` に加えて、`terminal.docker_image`、`terminal.docker_volumes`、`terminal.docker_forward_env`、`terminal.docker_env`、`terminal.docker_run_as_host_user`、`terminal.docker_extra_args`、`terminal.docker_persist_across_processes`、`terminal.docker_orphan_reaper` です。コンテナの寿命に関する決まりを含めた全体は [設定 → Docker バックエンド](/hermes/docs/user-guide/configuration/#docker-backend)を参照してください。
:::

## Docker Compose の例 {#docker-compose-example}

ゲートウェイとダッシュボードの両方を動かし続ける構成には、`docker-compose.yaml` を使うと便利です。

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

`docker compose up -d` で起動し、`docker compose logs -f` でログを見ます。見守られているゲートウェイの標準出力は、ボリュームの上の `${HERMES_HOME}/logs/gateways/<profile>/current` にも同時に書き出されます — 行き先の全体像は [ログはどこに出るか](#where-the-logs-go)を参照してください。

## 任意: Linux デスクトップの音声をつなぐ {#optional-linux-desktop-audio-bridge}

Docker の中で音声モードを使うには、別々の2つのことが必要です。コンテナの中で Hermes が音声の機器を調べられるようになっていること、そしてコンテナからホストの音声のサーバーに届くことです。以下の手順は、PulseAudio 互換のソケットを出している Linux のデスクトップ（多くの PipeWire の構成を含みます）について、ホスト側の音声の配管を説明します。

:::caution
これは Linux デスクトップ向けの回避策であって、Docker Desktop 全般の機能ではありません。すでにホストで音声が動いていて、Hermes のコンテナの中で CLI の音声モードを使いたいときに役立ちます。それでも Hermes が `Running inside Docker container -- no audio devices` と言う場合は、`PULSE_SERVER` / `PIPEWIRE_REMOTE` に対応した Docker での音声の検出を含むビルドを使ってください。
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

次に、ALSA の PulseAudio プラグインを入れた小さな派生イメージを作ります。

```dockerfile title="Dockerfile.audio"
FROM nousresearch/hermes-agent:latest

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends libasound2-plugins \
    && rm -rf /var/lib/apt/lists/*
```

Compose でそのイメージを使い、ホストのユーザーの PulseAudio のソケットとクッキーを渡します。

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

コンテナのプロセスがユーザーごとの音声のソケットに触れるよう、ホストの UID と GID を渡して起動します。

```sh
export HERMES_UID="$(id -u)"
export HERMES_GID="$(id -g)"
docker compose up -d --build
```

コンテナの中で PortAudio が何を見ているかを確かめるには次のようにします。

```sh
docker exec hermes /opt/hermes/.venv/bin/python -c "import sounddevice as sd; print(sd.query_devices())"
```

## 資源の上限 {#resource-limits}

Hermes のコンテナが必要とする資源は、ほどほどです。最低限の目安を挙げます。

| 資源 | 最低 | おすすめ |
|----------|---------|-------------|
| メモリ | 1 GB | 2〜4 GB |
| CPU | 1 コア | 2 コア |
| ディスク（データのボリューム） | 500 MB | 2 GB 以上（セッションやスキルが増えるほど大きくなります） |

いちばんメモリを使うのは、ブラウザの自動操作（Playwright / Chromium）です。ブラウザのツールが要らないなら 1 GB で足ります。ブラウザのツールを使うなら、少なくとも 2 GB は割り当ててください。

Docker で上限を決めるには次のようにします。

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  --memory=4g --cpus=2 \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

## Dockerfile が何をしているか {#what-the-dockerfile-does}

公式のイメージは `debian:13.4` を土台にしていて、次のものが入っています。

- Python 3.13。焼き込む追加機能（`all`、`messaging`、Anthropic / Bedrock / Azure の認証、Hindsight、Matrix）については、`uv sync --frozen --no-install-project` でロックファイルどおりに依存をそろえ、そのあと Hermes 自身を依存なしの編集可能な形で入れています。
- Node.js 26 と npm（ブラウザの自動操作、WhatsApp の橋渡し、TUI とデスクトップの一式、ワークスペースのビルド道具のために使います）
- Chromium 入りの Playwright（`npx playwright install --with-deps chromium --only-shell`）
- システムの道具として ripgrep、ffmpeg、git、`xz-utils`
- **`docker-cli`** — コンテナの中で動くエージェントが、ホストの Docker のデーモンを操れるようにします（使うには `/var/run/docker.sock` をバインドマウントします）。`docker build` や `docker run`、コンテナの中身を調べる操作などに使えます。
- **`openssh-client`** — コンテナの中から [SSH のターミナルのバックエンド](/hermes/docs/user-guide/configuration/#ssh-backend)を使えるようにします。SSH のバックエンドはシステムの `ssh` のバイナリを呼び出すので、これがないとコンテナで入れた場合に何も言わずに失敗していました。
- WhatsApp の橋渡し（`scripts/whatsapp-bridge/`）
- PID 1 としての **[`s6-overlay`](https://github.com/just-containers/s6-overlay) v3**（以前の `tini` を置き換えました）。ダッシュボードとプロファイルごとのゲートウェイを見守って落ちたら自動で再起動し、取り残された子プロセスを片付け、シグナルを渡します。

イメージは実行時、`/opt/hermes` を書き換えられないインストール先として扱います。Docker の中で使えるようにしておきたい任意の Python の追加機能、Node のワークスペース、TUI の資材は、イメージを作るときに焼き込む必要があります。実行時に必要になってから入れる動きは止めてあるので、見守られているゲートウェイや `docker exec hermes …` のコマンドが、読み取り専用のソースの場所へ依存の成果物を書き戻そうとすることはありません。

コンテナの `ENTRYPOINT` は小さな振り分け役（`docker/entrypoint-dispatch.sh`）です。コンテナが PID 1 を持っているとき（ふつうの Docker や Podman）は、s6-overlay の `/init` を exec するので、下で説明する見守りの仕組みが一式そろいます。プラットフォームがイメージのエントリーポイントを自前の PID 1 の init で包んでいるとき（Fly.io Machines、`docker run --init`、一部の Nomad や Kubernetes の構成）は、`/init` は `s6-overlay-suexec: fatal: can only run as pid 1` で止まってしまいます。そこで振り分け役は、代わりに stage2 の下準備を直接走らせ、s6 を使わずに主となるラッパーを exec します。この代替の経路でも指定したコマンドは動きますが、見守られるサービス（ダッシュボード、プロファイルごとのゲートウェイ）は使えません。

PID 1 の経路では、`/init` は次のことを行います。
1. root として `/etc/cont-init.d/01-hermes-setup`（= `docker/stage2-hook.sh`）を実行します。必要なら UID と GID を割り当て直し、ボリュームの所有者を直し、初回の起動時に `.env` / `config.yaml` / `SOUL.md` の種を置き、`HERMES_SKIP_CONFIG_MIGRATION=1` でない限り設定の形式の移行を対話なしで行い、同梱のスキルをそろえます。
2. `/etc/cont-init.d/02-reconcile-profiles`（= `hermes_cli.container_boot`）を実行します。`$HERMES_HOME/profiles/<name>/` をたどり、プロファイルごとのゲートウェイの s6 のサービス枠を `/run/service/gateway-<profile>/` に作り直し、最後に記録された状態が `running` だったものだけを自動で起動します（[プロファイルごとのゲートウェイの見守り](#per-profile-gateway-supervision)を参照してください）。
3. 固定の `main-hermes` と `dashboard` の s6-rc のサービスを起動します。
4. コンテナの CMD を主プログラムとして exec します（`/opt/hermes/docker/main-wrapper.sh`）。これは、ユーザーが `docker run` に渡した引数を次のように振り分けます。
   - 引数なし → `hermes`（既定）
   - 最初の引数が PATH にある実行ファイル（`sleep`、`bash` など）→ それを直接 exec
   - それ以外 → `hermes <args>`（サブコマンドとしてそのまま渡す）
   この主プログラムが終わるとコンテナも終わり、終了コードもそれに従います。

:::warning s6 より前のイメージからの、互換性のない変更
コンテナの ENTRYPOINT は `/usr/bin/tini` ではなく、`entrypoint-dispatch.sh` の振り分け役になりました（PID 1 のときは s6-overlay の `/init` に任せます）。文書に載っている5つの `docker run` の使い方（引数なし、`chat -q "…"`、`sleep infinity`、`bash`、`--tui`）は、tini を使ったイメージとまったく同じように動きます。tini 特有のシグナルの扱いや、`/usr/bin/tini --` を直接書いた呼び出しに頼った自前のラッパーがある場合は、前のイメージのタグに固定してください。
:::

:::warning 権限の考え方
`/init`（あるいは同じ働きをする、stage2 のフックへ渡す従来の `docker/entrypoint.sh` のラッパー）をコマンドの連なりに残すのでない限り、イメージのエントリーポイントを上書きしないでください。s6-overlay の `/init` は root として動き、初回の起動でボリュームの所有者を変えられるようにしています。そのあと、見守るすべてのサービスと主プログラムについて、`s6-setuidgid` で `hermes` ユーザーに降ります。公式のイメージの中で `hermes gateway run` を root として起動することは、初期状態で断られます。`/opt/data` に root が持つファイルが残り、あとからダッシュボードやゲートウェイを起動できなくなるおそれがあるからです。その危険をわかったうえで受け入れるときだけ、`HERMES_ALLOW_ROOT_GATEWAY=1` を設定してください。
:::

### `docker exec` は自動的に `hermes` ユーザーに降ります {#docker-exec-automatically-drops-to-the-hermes-user}

`docker exec hermes <cmd>` は、そのままだとコンテナの中で root として動きます。しかしイメージには `/opt/hermes/bin/hermes` に薄いラッパーが入っていて（PATH の中でいちばん先に来ます）、root からの呼び出しを見つけると、そのまま `s6-setuidgid hermes` を通して呼び直します。ですから `docker exec hermes login`、`docker exec hermes profile create …`、`docker exec hermes setup` などは、どれも UID 10000 が所有するファイルを書きます。つまり見守られているゲートウェイから読めるファイルになり、`--user` の指定を足す必要はありません。root 以外からの呼び出し（見守られているプロセス自身、`docker exec --user hermes`、コンテナの中のカンバンのサブエージェント）は近道を通って venv のバイナリを直接 exec するので、よく通る道に余計な手間はかかりません。

診断のためのセッション、root だけが見られる状態の確認、`/opt/data` の外にあって root が持っているファイルの操作など、root のまま `docker exec` したい場合は、その呼び出しごとに打ち消せます。

```sh
docker exec -e HERMES_DOCKER_EXEC_AS_ROOT=1 hermes <cmd>
```

ラッパーが受け付けるのは `1` / `true` / `yes` です（大文字と小文字は区別しません）。それ以外は — `=0` のような打ち間違いも含めて — すべて降りる側に落ちるので、気づかないうちに打ち消されることはありません。`s6-setuidgid` が使えない場合（s6-overlay を削った独自のビルドなど）、ラッパーは root として動くことを断り、代わりに 126 で終了します。権限の仕組みが壊れていることを黙って見過ごすのではなく、はっきり知らせるためです。かつては `docker exec hermes login` が `auth.json` を `root:root` で書いてしまい、見守られているゲートウェイの認証がどのチャットのプラットフォームのメッセージでも壊れる、という落とし穴がありました。

### プロファイルごとのゲートウェイの見守り {#per-profile-gateway-supervision}

`hermes profile create <name>` で作った各プロファイルには、`/run/service/gateway-<name>/` に登録された s6 に見守られるゲートウェイのサービスが自動で用意されます。コンテナの再起動をまたいで状態が残り、自動で起動し直します。使う側の流れと操作のコマンドについては、上の[複数のプロファイルへの対応](#multi-profile-support)を参照してください。

**s6 より前のイメージと比べて、見守りが良くなった点:**

- ゲートウェイが落ちても、`s6-supervise` が約1秒待ってから自動で起動し直します。
- `HERMES_DASHBOARD=1` で有効にしたダッシュボードも、同じ見守りの仕組みの上に載り、同じように自動で起動し直します。
- `docker restart`、イメージの更新（`docker compose up -d --force-recreate`）、思わぬ終了があっても、動いていたゲートウェイは保たれます。起動時の調整役が `$HERMES_HOME/profiles/<name>/gateway_state.json` を読み、最後に記録された状態が `running` なら枠を立ち上げ直すからです。`stopped` と記録され、再起動をまたいで止まったままになるのは、はっきり `hermes gateway stop` を実行したときだけです。再起動や更新のときにコンテナや s6 が送る SIGTERM は「まだ動いている」と見なされ、自動で起動し直します。
- プロファイルごとのゲートウェイのログは `$HERMES_HOME/logs/gateways/<profile>/current` に残ります（`s6-log` が入れ替えます）。調整役が行ったことは、起動のたびに `$HERMES_HOME/logs/container-boot.log` に追記されます。行き先の全体像は [ログはどこに出るか](#where-the-logs-go)を参照してください。

コンテナの中で `hermes status` を実行すると `Manager: s6 (container supervisor)` と表示されます。見守り役の生の状態を見るには `/command/s6-svstat /run/service/gateway-<name>` を使ってください（`/command/` が PATH に入るのは見守りの仕組みが動かすプロセスだけです。`docker exec` から呼ぶときは絶対パスを渡してください）。

## 新しいバージョンに上げる {#upgrading}

最新のイメージを取ってきて、コンテナを作り直します。データのディレクトリはそのまま残り、
コンテナはゲートウェイを起動する前に、マウントされた `$HERMES_HOME/config.yaml` に対して
設定の形式の移行を対話なしで行います。
移行が必要なときは、Hermes がまず `config.yaml` と `.env` の隣に、
時刻の付いたバックアップを書きます。

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
保存された設定を自分で確かめたり移行したりする必要があるときだけにしてください。

## スキルと認証情報のファイル {#skills-and-credential-files}

Docker を実行の場として使う場合（ここまでの方法ではなく、エージェントが Docker のサンドボックスの中でコマンドを動かす場合です — [設定 → Docker バックエンド](/hermes/docs/user-guide/configuration/#docker-backend)を参照してください）、Hermes はすべてのツールの呼び出しで長く生きる1つのコンテナを使い回し、スキルのディレクトリ（`~/.hermes/skills/`）と、スキルが必要だと宣言した認証情報のファイルを、読み取り専用のボリュームとして自動でそのコンテナにバインドマウントします。スキルのスクリプト、ひな形、参照用のファイルは、手で設定しなくてもサンドボックスの中から使えます。そしてコンテナは Hermes のプロセスが生きているあいだ残るので、入れた依存や書いたファイルは次のツールの呼び出しでもそのままです。

同じそろえ方は SSH と Modal のバックエンドでも行われます。スキルと認証情報のファイルは、コマンドを動かす前に rsync や Modal のマウント API で送られます。

## コンテナにさらに道具を入れる {#installing-more-tools-in-the-container}

公式のイメージには、選び抜かれた道具の一式が入っています（[Dockerfile が何をしているか](#what-the-dockerfile-does)を参照してください）。とはいえ、エージェントが使いたくなる道具がすべて入っているわけではありません。おすすめの方法が5つあり、手間と長持ちの度合いが小さいものから順に並べます。

### npm や Python の道具 — `npx` か `uvx` を使う {#npm-or-python-tools-use-npx-or-uvx}

npm や PyPI で公開されている道具なら、`npx`（npm）や `uvx`（Python）で動かすよう Hermes に指示し、そのコマンドを残り続ける記憶に覚えさせてください。設定のファイルや認証情報が要る道具なら、それらを `/opt/data` の下に置くよう指示します（たとえば `/opt/data/<tool>/config.yaml`）。

依存は必要になったときに取ってきて、コンテナが生きているあいだキャッシュされます。`/opt/data` の下に書いた設定は、バインドマウントしたホストのディレクトリの上にあるので、コンテナを再起動しても残ります。パッケージのキャッシュ自体は `docker rm` のあとに作り直しになりますが、`npx` と `uvx` は次にその道具を動かすときに、意識せずとも取り直してくれます。

### そのほかの道具（apt のパッケージ、バイナリ） — 入れて覚えさせる {#other-tools-apt-packages-binaries-install-and-remember}

npm や PyPI の外にあるもの — `apt` のパッケージ、できあいのバイナリ、イメージに入っていない言語の実行環境 — については、入れ方を Hermes に教え（たとえば `apt-get update && apt-get install -y <package>`）、その導入のコマンドを覚えるように伝えてください。その道具はコンテナが生きているあいだ残り、コンテナを再起動したあとで再び必要になったとき、Hermes が導入のコマンドを実行し直します。

すぐ入れられて、たまに使うくらいの道具にはこの方法が合っています。いつも使う道具なら、次の方法のほうがよいでしょう。

### 長く使う道具 — 派生イメージを作る {#durable-installs-build-a-derived-image}

コンテナを起動した瞬間から、入れ直しの待ち時間なしにその道具が使えている必要があるなら、`nousresearch/hermes-agent` を継いだ新しいイメージを作り、その道具を1つの層として入れてください。

```dockerfile
FROM nousresearch/hermes-agent:latest

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends <your-package> \
    && rm -rf /var/lib/apt/lists/*
USER hermes
```

作ったら、公式のイメージの代わりに使います。

```sh
docker build -t my-hermes:latest .
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  -p 8642:8642 \
  my-hermes:latest gateway run
```

エントリーポイントのスクリプトと `/opt/data` の扱いはそのまま引き継がれるので、このページの残りの内容もそのまま当てはまります。上流の `nousresearch/hermes-agent` の新しいものを取ってきたときは、イメージを作り直すのを忘れないでください。

### 込み入った道具や複数サービスの構成 — 隣にコンテナを立てる {#complex-tools-or-multi-service-stacks-run-a-sidecar-container}

自分でサービスを持ち込む道具（データベース、ウェブサーバー、キュー、画面なしのブラウザの群れ）や、Hermes のコンテナの中に置くには重すぎる道具は、共有した Docker のネットワークの上で別のコンテナとして動かしてください。Hermes はコンテナ名でその隣のコンテナに届きます。手元の推論サーバーに届くのと同じやり方です（[手元の推論サーバーにつなぐ](#connecting-to-local-inference-servers-vllm-ollama-etc)を参照してください）。

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

Hermes のコンテナの中からは、隣のコンテナに `http://my-tool:<port>` で届きます（そのコンテナが出しているプロトコルに合わせてください）。この形なら、サービスごとに寿命、資源の上限、更新の間隔を別々に保てますし、1つの道具のためだけに必要な依存で Hermes のイメージを膨らませずに済みます。

### 広く役に立つ道具 — issue か pull request を出す {#broadly-useful-tools-open-an-issue-or-pull-request}

その道具が Hermes Agent のほとんどの利用者にとって役立ちそうなら、自分だけの派生イメージで抱え込まずに、上流へ提案することを考えてください。[hermes-agent のリポジトリ](https://github.com/NousResearch/hermes-agent)で、その道具と使いどころを説明した issue か pull request を出しましょう。公式のイメージに取り込まれた道具は、すべての利用者の役に立ちますし、自分のフォークを保守し続ける手間もなくなります。

## 手元の推論サーバーにつなぐ（vLLM、Ollama など） {#connecting-to-local-inference-servers-vllm-ollama-etc}

Hermes を Docker で動かしていて、推論サーバー（vLLM、Ollama、text-generation-inference など）もホストや別のコンテナで動いている場合、ネットワークの設定に少し気を配る必要があります。

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

そのうえで `~/.hermes/config.yaml` では、ホスト名として**コンテナ名**を使います。

```yaml
model:
  provider: custom
  model: my-model
  base_url: http://vllm:8000/v1
  api_key: "none"
```

:::tip 押さえておきたい点
- ホスト名には**コンテナ名**（`vllm`）を使ってください。`localhost` や `127.0.0.1` は Hermes のコンテナ自身を指してしまいます。
- `model` の値は、vLLM に渡した `--served-model-name` と一致していなければなりません。
- `api_key` には空でない文字列を何か入れてください（vLLM はこのヘッダーを必要としますが、初期状態では中身を確かめません）。
- `base_url` の末尾にスラッシュを付けないでください。
:::

### Compose を使わない単体の docker run {#standalone-docker-run-no-compose}

推論サーバーがホストの上で直接動いている場合（Docker の中ではない場合）は、macOS と Windows では `host.docker.internal` を、Linux では `--network host` を使います。

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

:::warning `--network host` を使うと `-p` の指定は無視され、コンテナのポートはすべてそのままホストに出ます。
:::

### つながっているか確かめる {#verifying-connectivity}

Hermes のコンテナの中から、推論サーバーに届いていることを確かめます。

```sh
docker exec hermes curl -s http://vllm:8000/v1/models
```

用意したモデルを並べた JSON が返ってくるはずです。うまくいかないときは、次を確かめてください。

1. 両方のコンテナが同じ Docker のネットワークにいること（`docker network inspect hermes-net`）
2. 推論サーバーが `127.0.0.1` ではなく `0.0.0.0` で待ち受けていること
3. ポート番号が合っていること

### Ollama {#ollama}

Ollama も同じやり方です。Ollama がホストで動いているなら `host.docker.internal:11434`（macOS / Windows）か `127.0.0.1:11434`（Linux で `--network host` を使う場合）を指定します。Ollama が同じ Docker のネットワークの中の自分のコンテナで動いているなら、次のようにします。

```yaml
model:
  provider: custom
  model: llama3
  base_url: http://ollama:11434/v1
  api_key: "none"
```

## うまくいかないとき {#troubleshooting}

### コンテナがすぐ終了してしまう {#container-exits-immediately}

`docker logs hermes` でログを見てください。よくある原因は次のとおりです。
- `.env` のファイルがない、または内容が正しくない — まず対話モードで起動して設定を済ませてください
- ポートを公開して動かしている場合の、ポートのぶつかり

### 「Permission denied」のエラーが出る {#permission-denied-errors}

コンテナの stage2 のフックは、見守るサービスそれぞれの中で `s6-setuidgid` を使い、root ではない `hermes` ユーザー（UID 10000）に権限を落とします。ホスト側の `~/.hermes/` が別の UID の持ち物になっている場合は、`HERMES_UID` と `HERMES_GID` —— あるいは LinuxServer.io や NAS のイメージに合わせた別名の `PUID` と `PGID` —— をホストのユーザーに合わせて設定するか、データのディレクトリを書き込めるようにしてください。

```sh
chmod -R 755 ~/.hermes
```

NAS（UGOS、Synology、unRAID）では、データのディレクトリはたいてい**バインドマウント**で、コンテナからは `chown` できないホストの UID が所有しています。`PUID` と `PGID`（または `HERMES_UID` と `HERMES_GID`）をそのホストのユーザーに設定し、UID 10000 ではなくマウントの持ち主として動くようにしてください。

```sh
docker run -d \
  --name hermes \
  -e PUID=1000 -e PGID=10 \
  -v /volume1/docker/hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

`docker exec hermes <cmd>` も自動で UID 10000 に降ります。詳しい説明と、呼び出しごとに打ち消す方法は [`docker exec` は自動的に `hermes` ユーザーに降ります](#docker-exec-automatically-drops-to-the-hermes-user)を参照してください。

### `docker exec` のたびに「Permission denied」が出る（インストール先が 0700 に固まっている） {#permission-denied-on-every-docker-exec-install-dir-locked-to-0700}

2026年8月下旬より前に作られたイメージには、`/opt/hermes` の直下に認証情報のファイルを書くと、そのディレクトリが `0700` に絞られてしまう不具合がありました。その結果、`hermes` ユーザー（UID 10000）がインストール先から締め出され、以降の `docker exec` はすべて `Permission denied` で失敗します。

新しいイメージを取ってきてコンテナを作り直せば、恒久的に直ります（インストール先は `0755` で配られ、いまの版はもう絞りません）。作り直さずに、動いているコンテナをその場で回復させたい場合は次のようにします。

```sh
docker exec -u root hermes chmod 0755 /opt/hermes
```

### ブラウザのツールが動かない {#browser-tools-not-working}

Playwright は共有メモリを必要とします。docker run のコマンドに `--shm-size=1g` を足してください。

```sh
docker run -d \
  --name hermes \
  --shm-size=1g \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

### ネットワークの不調のあと、ゲートウェイがつなぎ直さない {#gateway-not-reconnecting-after-network-issues}

`--restart unless-stopped` を付けておけば、一時的な不調のほとんどは自動で吸収されます。それでもゲートウェイが動かなくなっているときは、コンテナを再起動してください。

```sh
docker restart hermes
```

### コンテナの様子を確かめる {#checking-container-health}

```sh
docker logs --tail 50 hermes          # Recent logs
docker run -it --rm nousresearch/hermes-agent:latest version     # Verify version
docker stats hermes                    # Resource usage
```
