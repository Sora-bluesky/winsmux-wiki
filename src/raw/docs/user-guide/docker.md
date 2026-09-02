---
title: "Hermes の Docker 設定"
description: "Hermes Agent を Docker で動かす方法と、Docker をターミナルのバックエンドとして使う方法"
upstream_path: user-guide/docker.md
upstream_blob: dbdb77cb215cee4668b532e26b117e8f9b966a9b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/docker
---

# Hermes の Docker 設定 {#hermes-docker-setup}

Docker と Hermes Agent の関わり方には、はっきり違う 2 つがあります。

1. **Hermes を Docker の中で動かす** — エージェント自身がコンテナの中で動きます（このページの主題です）
2. **Docker をターミナルのバックエンドとして使う** — エージェントはホストで動き、コマンドはすべて 1 つの長生きする Docker のサンドボックスコンテナの中で実行されます。このコンテナは、Hermes のプロセスが生きているあいだ、ツールの呼び出しをまたいでも `/new` をしてもサブエージェントを使っても残り続けます（[設定 → Docker バックエンド](/hermes/docs/user-guide/configuration/#docker-backend)を参照してください）

このページで扱うのは 1 のほうです。コンテナは、利用者のデータ（設定、API キー、セッション、スキル、記憶）をすべて、ホストから `/opt/data` にマウントした 1 つのディレクトリに置きます。イメージ自体は状態を持たないので、新しい版を取ってくれば、設定を失わずに入れ替えられます。

## クイックスタート {#quick-start}

Hermes Agent を初めて動かすなら、ホストにデータ用のディレクトリを作り、対話的にコンテナを起動して設定ウィザードを走らせます。

:::caution 導入のコマンドをブラウザ上の VPS コンソールで打たないでください
VPS の提供者によっては（Hetzner Cloud など）、ホストを管理するためのブラウザ上の
コンソールが用意されています。こうしたコンソールは特殊な文字を正しく送りません。`:` が `;` として届いたり、`@` の表示が崩れたり、英語以外の
キーボード配列ではさらにひどくなったりします。その結果、`-v ~/.hermes:/opt/data`、`-e KEY=value`
のような `docker run` の引数や、貼り付けた API キーやトークンが、気づかないうちに壊れます。

**代わりに SSH でつないでください**（`ssh root@<host>`）。コピーと貼り付けが安全にできます。どうしてもブラウザのコンソールを使うなら、貼り付けずに手で打ち、Enter を押す前に結果の `:`、`@`、`=`、`/` をひとつずつ見直してください。
:::

```sh
mkdir -p ~/.hermes
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent setup
```

これで設定ウィザードに入ります。API キーを尋ねられ、答えると `~/.hermes/.env` へ書き込まれます。この作業は一度きりです。この時点で、ゲートウェイが相手にするチャットの仕組みも設定しておくことを強く勧めます。

:::tip
コンテナの中で `hermes setup --portal` を一度実行してください。リフレッシュトークンは、マウントした `~/.hermes` のボリュームに残ります。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

## ゲートウェイとして動かす {#running-in-gateway-mode}

設定が済んだら、常駐のゲートウェイ（Telegram、Discord、Slack、WhatsApp など）としてコンテナを裏で動かします。

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  -p 8642:8642 \
  nousresearch/hermes-agent gateway run
```

8642 番のポートは、ゲートウェイの [OpenAI 互換の API サーバー](/hermes/docs/user-guide/features/api-server/)と稼働確認のエンドポイントを外に出します。チャットのプラットフォーム（Telegram、Discord など）しか使わないなら要りませんが、ダッシュボードや外部のツールからゲートウェイへ届かせたいなら必要です。

:::tip ゲートウェイは見守られながら動きます
公式の Docker イメージの中では、`gateway run` は **s6-overlay が自動で見守ります**。ゲートウェイのプロセスが落ちても、コンテナを失うことなく数秒で立ち上げ直され、ダッシュボード（`HERMES_DASHBOARD=1` を設定したとき）も同じように見守られます。`gateway run` の CMD のプロセス自体は `sleep infinity` の鼓動で、s6 が本物のゲートウェイのプロセスを管理しているあいだコンテナを生かしておく役です。ですから `docker stop` はこれまでどおり全部をきれいに落としますし、`docker logs` には見守られているゲートウェイの出力が出ます。

`docker logs` には、この仕組みに切り替わったことを示す 1 行の目印が出ます。使いたくないときは（そして「ゲートウェイがコンテナの主プロセスで、コンテナの終了 = ゲートウェイの終了」という昔の意味に戻したいときは）、`--no-supervise` を渡すか `HERMES_GATEWAY_NO_SUPERVISE=1` を設定します。この切り替えは、コンテナにゲートウェイの終了コードで終わってほしい CI の簡易テストで役立ちます。本番の運用では、見守るほうの既定が明確に優れています。

この振る舞いは s6 を使ったイメージだけの話です。それより前の（tini を使った）イメージは、これまでどおり `gateway run` を前面の主プロセスとして動かします。
:::

:::note ゲートウェイのログの行き先
振り分けの全体像（プロファイルごとのゲートウェイ、ダッシュボード、起動時の調整役、コンテナ全体の `docker logs`）は、下の[ログの行き先](#where-the-logs-go)の節を参照してください。
:::

:::note 人の見ていないゲートウェイでのツールの堂々巡りの強制停止
人が見ていないゲートウェイと cron のセッションでは、`non_interactive_hard_stop_enabled` によって、ツールの堂々巡りを強制的に止める仕組みが既定で働きます。対話的な CLI、TUI、デスクトップ、ACP のセッションでは警告だけにとどまります。人の見ていない環境でこれを外すには、そのプロファイルの `config.yaml` にこう書きます。

```yaml
tool_loop_guardrails:
  non_interactive_hard_stop_enabled: false
```
:::

補足: API サーバーは `API_SERVER_ENABLED=true` で開きます。コンテナの中の `127.0.0.1` の外へ出すには、`API_SERVER_HOST=0.0.0.0` と `API_SERVER_KEY`（8 文字以上。`openssl rand -hex 32` で作れます）も設定してください。例を挙げます。

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

インターネットに面した端末でポートを開けるのは、それ自体が危険です。危険を分かっていないなら開けないでください。

## ダッシュボードを動かす {#running-the-dashboard}

組み込みの Web ダッシュボードは、同じコンテナの中でゲートウェイと並んで、s6-rc に見守られるサービスとして動きます。立ち上げるには `HERMES_DASHBOARD=1` を設定します。

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

ダッシュボードは s6 が見守ります。落ちたら `s6-supervise` が少し間を置いて自動で立ち上げ直します。ダッシュボードの標準出力と標準エラーは `docker logs <container>` へ流れます（接頭辞は付きません。ゲートウェイ自身の出力はプロファイルごとの s6 のログファイルへ移ったので、下の[ログの行き先](#where-the-logs-go)を参照してください。2 つの流れがぶつかることはありません）。

| 環境変数 | 説明 | 既定 |
|---------------------|-------------|---------|
| `HERMES_DASHBOARD` | `1`（または `true` / `yes`）にすると、見守られるダッシュボードのサービスが有効になります | *(未設定 — サービスは登録されるが止まったまま)* |
| `HERMES_DASHBOARD_HOST` | ダッシュボードの HTTP サーバーが待ち受けるアドレス | `0.0.0.0` |
| `HERMES_DASHBOARD_PORT` | ダッシュボードの HTTP サーバーのポート | `9119` |
| `HERMES_DASHBOARD_INSECURE` | **廃止 / 何もしません。** 以前は認証の関門を素通りさせていましたが、2026 年 6 月の強化以降、認証を無効にしません。ループバック以外で待ち受ける場合は、常に認証の提供元が必要です | *(無視されます — 代わりに提供元を設定してください)* |

コンテナの中のダッシュボードは、既定で `0.0.0.0` を待ち受けます。そうでなければ、公開した `-p 9119:9119` のポートにホストから届きません。コンテナ内のループバックだけに絞りたいときは（サイドカーやリバースプロキシを使う構成など）、`HERMES_DASHBOARD_HOST=127.0.0.1` を設定します。

ダッシュボードの認証の関門は、次の 2 つがどちらも成り立つときに自動で働きます。

1. 待ち受けるアドレスがループバックでない（コンテナの中の既定の `0.0.0.0` など）、**かつ**
2. `DashboardAuthProvider` のプラグインが登録されている。

2 つ目を満たす方法は、最初から 3 つ用意されています。

- **ユーザー名とパスワード** — 信頼できるネットワークの中や VPN の後ろで、自分で立てた社内・自宅のコンテナに向く、いちばん簡単な方法です。`HERMES_DASHBOARD_BASIC_AUTH_USERNAME` と `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD`（再起動をまたいでセッションを保つには `HERMES_DASHBOARD_BASIC_AUTH_SECRET` も）を設定します。インターネットへ直接さらす用途には向きません。
- **OAuth（Nous Portal）** — ホスティングや一般公開の環境向けです。`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を設定すると `dashboard_auth/nous` の提供元が有効になります。
- **自前の OIDC** — 標準の OpenID Connect で自分の認証基盤に問い合わせます。`HERMES_DASHBOARD_OIDC_ISSUER` と `HERMES_DASHBOARD_OIDC_CLIENT_ID` を設定すると `dashboard_auth/self_hosted` の提供元が有効になります。

どれを選んでも、関門は保護された経路へ入る前にログインの画面へ案内します。3 つの提供元については [Web ダッシュボード → 認証](/hermes/docs/user-guide/features/web-dashboard/#authentication-gated-mode)を参照してください。

Traefik や nginx のようなリバースプロキシが別のコンテナで動いている場合、その
ブリッジネットワーク上のアドレスは既定では信頼されません。マウントした `config.yaml`
にダッシュボードの公開 URL を書き、そのプロキシの正確な IP か、専用のプロキシ用ネットワークなら範囲を限った
CIDR だけを信頼させてください。

```yaml
dashboard:
  public_url: "https://dashboard.example.com"
  trusted_proxies:
    - "172.20.0.5"
    # Or, if the proxy address is dynamic on a dedicated network:
    # - "172.20.0.0/24"
```

こうすると、そのプロキシの `X-Forwarded-Proto: https` が安全な OAuth の
クッキーを左右できるようになり、他の相手からの転送ヘッダは信頼されないままになります。`*`、`0.0.0.0/0`、`::/0`
は使わないでください。範囲を限っていないこれらの指定を Hermes は拒みます。

提供元が 1 つも登録されておらず、ループバック以外で待ち受けている場合、ダッシュボードは**起動の時点で安全側に倒れて止まり**、足りない環境変数を指し示すエラーを出します。公開のアドレスで認証なしにダッシュボードを出す抜け道は、もうありません。`HERMES_DASHBOARD_INSECURE=1` は廃止され、何もしません（警告を出して無視されます）。提供元を設定するか、`HERMES_DASHBOARD_HOST=127.0.0.1` で待ち受けて SSH のトンネルや Tailscale 越しにダッシュボードへ届くようにしてください。

:::warning `--insecure` をなくした理由
認証のないダッシュボードの公開は、2026 年 6 月に起きた MCP 設定への居座り攻撃の入口でした。インターネットの探索者がさらされたダッシュボード（と OpenAI の API サーバー）にたどり着き、エージェントを操って SSH の鍵による裏口を仕込ませたのです。いまはループバック以外で待ち受けるすべての場合に、認証の関門が必須です。信頼できる LAN や自宅の機械なら、最初から入っているユーザー名とパスワードの提供元（`HERMES_DASHBOARD_BASIC_AUTH_USERNAME` と `_PASSWORD`）が、何も用意せずに満たせる方法です。
:::

ダッシュボードを別のコンテナで動かすこと**は**できますが、そのコンテナがホストの PID と ネットワークの名前空間を共有している必要があります（たとえば `network_mode: host`。リポジトリ自身の `docker-compose.yml` の `dashboard` サービスがそうしています）。ゲートウェイが生きているかどうかの検出には、ゲートウェイのプロセスと PID の名前空間を共有していることが要るので、この制限が当てはまるのは、PID の名前空間を共有しないブリッジネットワークの独立したコンテナで動かすダッシュボードだけです。

## 対話的に動かす（CLI のチャット） {#running-interactively-cli-chat}

すでにあるデータのディレクトリに対して対話的なチャットを開くには、こうします。

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent
```

動いているコンテナの中でターミナルをすでに開いているなら（Docker Desktop などから）、これだけです。

```sh
/opt/hermes/.venv/bin/hermes
```

## 残り続けるボリューム {#persistent-volumes}

`/opt/data` のボリュームは、Hermes のすべての状態の正本です。ホストの `~/.hermes/` ディレクトリに対応し、次を含みます。

| パス | 中身 |
|------|----------|
| `.env` | API キーと秘密 |
| `config.yaml` | Hermes のすべての設定 |
| `SOUL.md` | エージェントの人格・自己像 |
| `sessions/` | 会話の履歴 |
| `memories/` | 残り続ける記憶の置き場 |
| `skills/` | 入れてあるスキル |
| `home/` | Hermes のツールのサブプロセス（`git`、`ssh`、`gh`、`npm`、スキルの CLI）が使う、プロファイルごとの HOME |
| `cron/` | 定時実行の定義 |
| `hooks/` | イベントのフック |
| `logs/` | 実行時のログ |
| `skins/` | CLI の外観 |

### 書き換えないインストール先 {#immutable-install-tree}

ホスティング用および公開されている Docker のイメージでは、`/opt/hermes` がアプリケーションの入っている場所です。root の持ち物で、動作中の `hermes` ユーザーからは読むだけなので、エージェントのやり取り、ゲートウェイのセッション、ダッシュボードの操作、ふつうの `docker exec hermes hermes ...` のコマンドからは、中核のソース、同梱の `.venv`、`node_modules`、TUI の一式をその場で書き換えられません。

書き換わる Hermes の状態はすべて `/opt/data` の下に属します。設定、`.env`、プロファイル、スキル、記憶、セッション、ログ、ダッシュボードへの投入物、プラグイン、その他あなたが管理するファイルです。イメージは実行時の `.pyc` の書き出しと、`/opt/hermes` への Hermes の遅延依存インストールも止めています。公開イメージに必要な追加のプラットフォーム依存は、イメージに焼き込むか、イメージを作り直して入れてください。

ホスティング用・公開のイメージでは、エージェントの自己改善は `/opt/data` の下のスキル・記憶・プラグイン・設定に限られます。`/opt/hermes` にある中核のソースは書き換えません。中核の変更はリポジトリへの PR で行い、イメージを更新して届けるのであって、動いているインストール先を生で書き換えるのではありません。

運用者が `/opt/data` の外のファイルを直したり調べたりする必要があるときは、意図して root のシェルを使ってください。`hermes` の橋渡しは、ふだん `docker exec hermes hermes ...` を動作中のユーザーへ落とします。root の権限が本当に要る一回きりの実行では、`HERMES_DOCKER_EXEC_AS_ROOT=1` を設定してください。

`~` の下に資格情報を置くスキルの CLI は、データのボリュームの根っこではなく、サブプロセスの HOME に対して用意する必要があります。たとえば [xurl のスキル](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/)は OAuth の状態を `~/.xurl` に置きますが、公式の Docker の配置では Hermes のツールの呼び出しはそれを `/opt/data/home/.xurl` として読みます。ですから xurl の認証を手で行うときは `HOME=/opt/data/home` を付け、`HOME=/opt/data/home xurl auth status` で確かめてください。

:::warning
同じデータのディレクトリに対して、2 つの Hermes の**ゲートウェイ**コンテナを同時に動かしてはいけません。セッションのファイルと記憶の置き場は、同時に書き込まれることを想定していません。
:::

## 複数プロファイルへの対応 {#multi-profile-support}

Hermes は[複数のプロファイル](/hermes/docs/reference/profile-commands/)に対応しています。`~/.hermes/` の下の別々のディレクトリで、1 つのインストールから独立したエージェント（SOUL、スキル、記憶、セッション、資格情報がそれぞれ別）を動かせます。**公式の Docker イメージの中では、s6 の見守りの木はプロファイルを一人前の見守り対象として扱う**ので、勧められる形は**すべてのプロファイルを 1 つのコンテナで抱えること**です。

`hermes profile create <name>` で作ったプロファイルには、次が付きます。

- `/run/service/gateway-<name>/` に専用の s6 のサービス枠。実行時に動的に登録されるので、コンテナを作り直す必要はありません。
- 落ちたときの自動再起動。間隔は `s6-supervise` が調整します。
- `${HERMES_HOME}/logs/gateways/<name>/current` にプロファイルごとの回転するログ（1 MB × 10 世代）。
- コンテナの再起動をまたいだ状態の保存。起動時の調整役が各プロファイルのディレクトリから `gateway_state.json` を読み、最後に記録された状態が `running` だったプロファイルの枠だけを立ち上げ直します。再起動しても止まったままになるのは、あなたが明示的に止めた（`hermes gateway stop`）ゲートウェイだけです。コンテナの再起動、イメージの更新、思わぬ終了では記録が `running` のまま残るので、次の起動でゲートウェイは自動で立ち上がります。

ホストで実行する操作のコマンドは、コンテナの中からも同じように使えます。

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

裏では、コンテナの中の `hermes gateway start/stop/restart` は横取りされ、正しいサービスのディレクトリに対する `s6-svc` へ渡されます。s6 のコマンドを直接覚える必要はありません。見守り役の生の状態を見たいときは `/command/s6-svstat /run/service/gateway-<name>` を使ってください（`/command/` が PATH に入るのは見守りの木から生まれたプロセスだけなので、`docker exec` から呼ぶときは絶対パスで渡します）。

### コンテナの外から複数のプロファイルへ届かせる {#reaching-more-than-one-profile-from-outside-the-container}

外からプロファイルのゲートウェイへ届く道は 2 つあり、それぞれ動きが違います。混同しないでください。

**Hermes デスクトップ（と Web ダッシュボード）。** デスクトップアプリの **Remote Gateway** の接続がしゃべる相手は `hermes dashboard` のバックエンド（既定は **9119 番のポート**、`HERMES_DASHBOARD=1` で有効になります）で、OpenAI の API サーバー*ではありません*。1 つのダッシュボードのバックエンドが、同じ場所にある**すべての**プロファイルを引き受けます。アプリのプロファイル切り替えが要求ごとに宛先のプロファイルを送り、バックエンドがディスク上のそのプロファイルの `HERMES_HOME` を開くからです。ですからデスクトップのために、プロファイルごとに 2 つ目のポートや 2 つ目の接続を用意する必要は**ありません**。`:9119` の 1 本の接続が、切り替えを通してすべてをまかないます。

**OpenAI 互換のクライアント（Open WebUI、LobeChat、`/v1/...`）。** これらがしゃべる相手はプロファイルごとの **API サーバー**で、こちらは**どのプロファイルでも 8642 番のポート**を掴みます（`API_SERVER_PORT` か `platforms.api_server.extra.port` から決まります。自動の割り当ても、`config.yaml` の `gateway.port` のような項目もありません）。クライアントから*特定の* 2 つ目のプロファイルへ届かせたいなら、そのプロファイル**自身の** `.env` に別の `API_SERVER_PORT` を与えてください。そうしないと、そのゲートウェイも 8642 を掴もうとして既定のプロファイルとぶつかります。

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

`API_SERVER_PORT` は各プロファイル**自身の** `.env` に書き、コンテナ全体の `environment:` の塊には決して書かないでください。全体の値を置くと、すべてのプロファイルが同じポートへ押し込まれ、ぶつかります。ブリッジのネットワークを使っているなら、追加のポートを `docker-compose.yml` で公開します（`- "8643:8643"`）。`network_mode: host` ならすでにホストから届きます。既定のプロファイルの 8642 の接続はそのままです。

### なぜコンテナを増やさず、1 つで多くのプロファイルを抱えるのか {#why-one-container-with-many-profiles-not-many-containers}

s6 へ移る前は「プロファイルごとに 1 コンテナ」が勧められる形でした。コンテナの中に複数のゲートウェイを見守る役がいなかったからです。s6 が PID 1 になったいま、それはもう必要なく、1 つのコンテナにまとめる形がほとんどの面で簡単です。

| | 1 コンテナに多くのプロファイル | プロファイルごとに 1 コンテナ |
|---|---|---|
| ディスクの負担 | イメージ 1 つ、同梱の venv 1 つ、Playwright のキャッシュ 1 つ | N 個のイメージと N 個のキャッシュ |
| メモリの負担 | Python のインタプリタのキャッシュと node_modules を共有 | コンテナごとに重複 |
| プロファイルを作る | `docker exec ... hermes profile create <name>`（数秒） | 新しい `docker run` の実行 + ポートの割り当て + 設定のマウント |
| プロファイルごとの復旧 | `s6-supervise` の自動再起動 | Docker の `--restart unless-stopped`（遅く、隣の仕事も巻き添えにする） |
| ログ | `s6-log` によるプロファイルごとの回転ファイルと、コンテナ起動の記録 | コンテナごとの `docker logs <name>`。回転の仕組みはなし |
| バックアップ | `~/.hermes` の 1 ディレクトリ | 揃えるべき N 個のディレクトリ |

既定のプロファイル（`default`）は最初の起動で必ず登録されるので、新しいコンテナは見守られたゲートウェイを 1 つ備えた状態で届きます。プロファイルを足すのは、純粋に実行時の作業です。

### それでもコンテナを分けたくなるとき {#when-you-do-want-a-separate-container}

コンテナの中でプロファイルを分けるのが既定です。プロファイルごとにコンテナを分けるのは、はっきりした理由があるときだけにしてください。

- **仕事ごとに資源を隔てたい** — たとえば、プロファイル A で暴走したブラウザのツールのセッションが、プロファイル B のメモリを食い尽くさないようにしたい。コンテナならプロファイルごとに `--memory` や `--cpus` を指定できます。
- **イメージの版を別々に固定したい** — 仕事ごとに上流のイメージのタグを変えたい。
- **ネットワークを分けたい** — プロファイルごとに別の Docker のネットワーク（たとえば顧客向けと社内用）。
- **法令順守や被害の範囲** — 別々の資格情報が、OS のプロセスの木を共有しないようにしたい。

その場合は、`container_name`、`volumes`、`ports` をそれぞれ分けて、プロファイルごとに 1 つのサービスを書きます。

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

[残り続けるボリューム](#persistent-volumes)の警告はここでも生きています。2 つのコンテナを同じ `~/.hermes` のディレクトリへ同時に向けてはいけません。コンテナの中の s6 の見守り役は、自分のプロファイルの一式を管理します。データのボリュームをコンテナ同士で共有すると、セッションのファイルと記憶の置き場が壊れます。

## ログの行き先 {#where-the-logs-go}

s6 のコンテナにはログの出口が 4 つあり、「`docker logs` にゲートウェイの何も出ないのはなぜか」はよくある驚きです。早見表を挙げます。

| 出どころ | 行き先 | 読み方 |
|---|---|---|
| **プロファイルごとのゲートウェイ**（`hermes gateway run` と、s6 の下のプロファイルごとのゲートウェイ） | 2 か所に分けて出ます。`docker logs <container>`（そのまま、余分な接頭辞なし）**と** `${HERMES_HOME}/logs/gateways/<profile>/current`（回転あり、ISO-8601 の時刻付き、1 MB × 10 世代） | ホストで `docker logs -f hermes` または `tail -F ~/.hermes/logs/gateways/default/current` |
| **ダッシュボード**（`HERMES_DASHBOARD=1` のとき） | `docker logs <container>`（接頭辞なし） | `docker logs -f hermes`。ゲートウェイの行と混ざります |
| **起動時の調整役**（コンテナが立ち上がるたびに、どのプロファイルのゲートウェイを戻したかを記録します） | `${HERMES_HOME}/logs/container-boot.log`（追記だけの記録） | `tail -F ~/.hermes/logs/container-boot.log` |
| **Hermes 全体のログ**（`agent.log`、`errors.log`） | `${HERMES_HOME}/logs/`（プロファイルを見分けます） | `docker exec hermes hermes logs --follow [--level WARNING] [--session <id>]` |

知っておくと役立つことが 2 つあります。

- コンテナの再起動をまたいで残るのは、`logs/gateways/<profile>/current` のファイルのほうです。`docker logs` はいまのコンテナが生きているあいだの出力しか保たず（`docker rm` で消えます）、回転するファイルはマウントしたボリュームに残ります。
- 起動時の調整役が残す行の形は `<iso-timestamp> profile=<name> prior_state=<state> action=<registered|started>` なので、`grep profile=coder ~/.hermes/logs/container-boot.log` と打つだけで、そのプロファイルが最後にいつ戻されたのか、s6 が自動で立ち上げたのかが分かります。

## 環境変数を渡す {#environment-variable-forwarding}

API キーは、コンテナの中の `/opt/data/.env` から読まれます。環境変数として直接渡すこともできます。

```sh
docker run -it --rm \
  -v ~/.hermes:/opt/data \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e OPENAI_API_KEY="sk-..." \
  nousresearch/hermes-agent
```

`-e` で直接渡した値は `.env` の値より優先されます。キーをディスクに置きたくない CI/CD や秘密の管理サービスとの連携で役立ちます。

:::note Docker を**ターミナルのバックエンド**として使いたい場合は
このページで扱っているのは、Hermes 自身を Docker の中で動かす話です。エージェントの `terminal` や `execute_code` の呼び出しを Docker のサンドボックスのコンテナの中で実行させたいなら（Hermes のプロセスをまたいで共有される、長生きするコンテナが 1 つ。issue #20561 を参照してください）、それは別の設定の塊です。`terminal.backend: docker` に加えて、`terminal.docker_image`、`terminal.docker_volumes`、`terminal.docker_forward_env`、`terminal.docker_env`、`terminal.docker_run_as_host_user`、`terminal.docker_extra_args`、`terminal.docker_persist_across_processes`、`terminal.docker_orphan_reaper` を使います。コンテナの一生に関する決まりも含めた全体は、[設定 → Docker バックエンド](/hermes/docs/user-guide/configuration/#docker-backend)を参照してください。
:::

## Docker Compose の例 {#docker-compose-example}

ゲートウェイとダッシュボードの両方を常駐させるなら、`docker-compose.yaml` を使うと楽です。

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

`docker compose up -d` で始め、`docker compose logs -f` でログを見ます。見守られているゲートウェイの標準出力は、ボリューム上の `${HERMES_HOME}/logs/gateways/<profile>/current` にも分けて出ます。振り分けの全体像は[ログの行き先](#where-the-logs-go)を参照してください。

## 任意: Linux デスクトップの音声の橋渡し {#optional-linux-desktop-audio-bridge}

Docker の中で音声モードを使うには、2 つのことが要ります。コンテナの中で Hermes が音声のデバイスを調べられること、そしてコンテナからホストの音声サーバーへ届くことです。ここでは、PulseAudio 互換のソケットを出している Linux デスクトップ（多くの PipeWire の構成を含みます）向けに、ホスト側の音声の配管を説明します。

:::caution
これは Linux デスクトップ向けの回避策であって、Docker Desktop の一般的な機能ではありません。ホスト側の音声がすでに動いていて、Hermes のコンテナの中で CLI の音声モードを使いたいときに役立ちます。それでも Hermes が `Running inside Docker container -- no audio devices` と言うなら、`PULSE_SERVER` / `PIPEWIRE_REMOTE` に対する Docker での音声の探索に対応したビルドを使ってください。
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

そのイメージを Compose で使い、ホストのユーザーの PulseAudio のソケットとクッキーを渡します。

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

コンテナのプロセスがユーザーごとの音声のソケットへ届くよう、ホストの UID と GID を渡して起動します。

```sh
export HERMES_UID="$(id -u)"
export HERMES_GID="$(id -g)"
docker compose up -d --build
```

コンテナの中から PortAudio に何が見えているかを確かめるには、こうします。

```sh
docker exec hermes /opt/hermes/.venv/bin/python -c "import sounddevice as sd; print(sd.query_devices())"
```

## 資源の上限 {#resource-limits}

Hermes のコンテナが必要とする資源はほどほどです。勧められる下限を挙げます。

| 資源 | 最低 | 推奨 |
|----------|---------|-------------|
| メモリ | 1 GB | 2〜4 GB |
| CPU | 1 コア | 2 コア |
| ディスク（データのボリューム） | 500 MB | 2 GB 以上（セッションとスキルで増えます） |

いちばんメモリを食うのはブラウザの自動操作（Playwright / Chromium）です。ブラウザのツールが要らないなら 1 GB で足ります。使うなら 2 GB 以上を割り当ててください。

Docker で上限を決めるにはこうします。

```sh
docker run -d \
  --name hermes \
  --restart unless-stopped \
  --memory=4g --cpus=2 \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

## Dockerfile が何をしているか {#what-the-dockerfile-does}

公式のイメージは `debian:13.4` を土台にしていて、次を含みます。

- Python 3.13。焼き込む追加分（`all`、`messaging`、Anthropic / Bedrock / Azure の認証、Hindsight、Matrix）の依存はロックファイルから `uv sync --frozen --no-install-project` で揃え、そのあと Hermes 自身を依存なしの編集可能な形で入れます。
- Node.js 26 と npm（ブラウザの自動操作、WhatsApp の橋渡し、TUI / デスクトップの一式、ワークスペースのビルド用）
- Chromium 付きの Playwright（`npx playwright install --with-deps chromium --only-shell`）
- システムの道具として ripgrep、ffmpeg、git、`xz-utils`
- **`docker-cli`** — コンテナの中で動くエージェントが、ホストの Docker デーモンを操れるようにするためです（使うには `/var/run/docker.sock` をマウントします）。`docker build`、`docker run`、コンテナの確認などに使えます。
- **`openssh-client`** — コンテナの中から [SSH のターミナルバックエンド](/hermes/docs/user-guide/configuration/#ssh-backend)を使えるようにします。SSH のバックエンドはシステムの `ssh` を呼び出すので、これがないとコンテナでの導入では黙って失敗していました。
- WhatsApp の橋渡し（`scripts/whatsapp-bridge/`）
- PID 1 としての **[`s6-overlay`](https://github.com/just-containers/s6-overlay) v3**（以前の `tini` に代わるものです）。ダッシュボードとプロファイルごとのゲートウェイを見守って落ちたら立ち上げ直し、ゾンビになったサブプロセスを片付け、シグナルを転送します。

イメージは実行時、`/opt/hermes` を書き換えないインストール先として扱います。Docker の中で使えるようにしたい Python の追加分、Node のワークスペース、TUI の資材は、イメージを作るときに焼き込む必要があります。実行時の遅延インストールは止めてあるので、見守られたゲートウェイや `docker exec hermes …` のコマンドが、読み取り専用のソースへ依存の成果物を書き戻そうとすることはありません。

コンテナの `ENTRYPOINT` は小さな振り分け役（`docker/entrypoint-dispatch.sh`）です。コンテナが PID 1 を持っているとき（ふつうの Docker / Podman）は s6-overlay の `/init` を exec し、下で説明する見守りの木がまるごと手に入ります。プラットフォームがイメージの入口を自前の PID 1 の init で包んでいるとき（Fly.io Machines、`docker run --init`、一部の Nomad / Kubernetes の構成）、`/init` は `s6-overlay-suexec: fatal: can only run as pid 1` で止まってしまうので、振り分け役は代わりに stage2 の下ごしらえを直接実行し、s6 なしで主のラッパーを exec します。この代わりの道でも、頼んだコマンドは動きますが、見守られるサービス（ダッシュボード、プロファイルごとのゲートウェイ）は使えません。

PID 1 の道では、`/init` は次を行います。
1. root として `/etc/cont-init.d/01-hermes-setup`（= `docker/stage2-hook.sh`）を実行します。UID / GID の付け替え（任意）、ボリュームの持ち主の修正、初回起動での `.env` / `config.yaml` / `SOUL.md` の用意、`HERMES_SKIP_CONFIG_MIGRATION=1` でなければ対話なしの設定の移行、同梱スキルの反映を行います。
2. `/etc/cont-init.d/02-reconcile-profiles`（= `hermes_cli.container_boot`）を実行します。`$HERMES_HOME/profiles/<name>/` をたどり、プロファイルごとのゲートウェイの s6 のサービス枠を `/run/service/gateway-<profile>/` に作り直し、最後に記録された状態が `running` だったものだけを自動で立ち上げます（[プロファイルごとのゲートウェイ管理](#per-profile-gateway-supervision)を参照してください）。
3. 固定の `main-hermes` と `dashboard` の s6-rc のサービスを始めます。
4. コンテナの CMD を主のプログラムとして exec します（`/opt/hermes/docker/main-wrapper.sh`）。これは `docker run` に渡された引数を次のように振り分けます。
   - 引数なし → `hermes`（既定）
   - 最初の引数が PATH 上の実行ファイル（`sleep`、`bash` など）→ そのまま実行します
   - それ以外 → `hermes <args>`（サブコマンドとして通します）
   この主のプログラムが終わると、その終了コードでコンテナも終わります。

:::warning s6 より前のイメージからの非互換な変更
コンテナの ENTRYPOINT は `/usr/bin/tini` ではなく、`entrypoint-dispatch.sh` の振り分け役になりました（PID 1 のときは s6-overlay の `/init` へ渡します）。文書にある 5 つの `docker run` の使い方（引数なし、`chat -q "…"`、`sleep infinity`、`bash`、`--tui`）は、tini のイメージとまったく同じに動きます。tini 固有のシグナルの扱いや、`/usr/bin/tini --` の直書きに頼った下流のラッパーがあるなら、前のイメージのタグに固定してください。
:::

:::warning 権限の考え方
イメージの入口を差し替えるなら、`/init`（あるいは同じことですが、stage2 のフックへ渡す従来の `docker/entrypoint.sh` の橋渡し）をコマンドの連なりに残してください。s6-overlay の `/init` は root として動き、初回起動でボリュームの持ち主を変えられるようにします。そのあと、見守られるすべてのサービスと主のプログラムのために `s6-setuidgid` で `hermes` ユーザーへ落ちます。公式のイメージの中で `hermes gateway run` を root として始めることは既定で拒まれます。`/opt/data` に root の持ち物のファイルが残り、あとでダッシュボードやゲートウェイが立ち上がらなくなることがあるからです。その危険を承知のうえで受け入れるときだけ、`HERMES_ALLOW_ROOT_GATEWAY=1` を設定してください。
:::

### `docker exec` は自動で `hermes` ユーザーへ落ちます {#docker-exec-automatically-drops-to-the-hermes-user}

`docker exec hermes <cmd>` は既定でコンテナの中の root として動きますが、イメージには `/opt/hermes/bin/hermes` という薄い橋渡しが入っていて（PATH のいちばん前にあります）、root からの呼び出しを見分けて `s6-setuidgid hermes` を通して透過的に実行し直します。ですから `docker exec hermes login`、`docker exec hermes profile create …`、`docker exec hermes setup` などは、`--user` のフラグを足さなくても UID 10000 の持ち物としてファイルを書きます。つまり、見守られたゲートウェイから読める形です。root 以外からの呼び出し（見守られているプロセス自身、`docker exec --user hermes`、コンテナの中のカンバンのサブエージェント）は近道を通って venv の実行ファイルを直接呼ぶので、よく通る道に余計な負担はありません。

診断のためのセッション、root だけが見られる状態の確認、`/opt/data` の外にある root の持ち物のファイルなど、root の権限を保った `docker exec` がどうしても要るときは、その実行だけ外せます。

```sh
docker exec -e HERMES_DOCKER_EXEC_AS_ROOT=1 hermes <cmd>
```

橋渡しが受け付けるのは `1` / `true` / `yes`（大文字小文字は問いません）です。それ以外は、`=0` のような打ち間違いも含めてすべて落とす動きになるので、気づかないうちに外れることはありません。`s6-setuidgid` が使えない場合（s6-overlay を取り除いた独自のビルドなど）、橋渡しは root として動くことを拒み、代わりに 126 で終了します。壊れた権限の仕組みを黙って通すのではなく、はっきり見せるためです。かつては `docker exec hermes login` が `auth.json` を `root:root` として書き、見守られたゲートウェイの認証がどのチャットのプラットフォームでも壊れる、という落とし穴がありました。

### プロファイルごとのゲートウェイ管理 {#per-profile-gateway-supervision}

`hermes profile create <name>` で作ったプロファイルには、`/run/service/gateway-<name>/` に s6 が見守るゲートウェイのサービスが自動で登録され、コンテナの再起動をまたいで状態を保ったまま自動で立ち上がります。利用者から見た流れと操作のコマンドは、上の[複数プロファイルへの対応](#multi-profile-support)を参照してください。

**s6 より前のイメージに比べた、見守りの利点:**

- ゲートウェイが落ちても、`s6-supervise` がおよそ 1 秒待って自動で立ち上げ直します。
- `HERMES_DASHBOARD=1` で有効にしたダッシュボードも同じ見守りの木に乗り、同じように自動で立ち上げ直されます。
- `docker restart`、イメージの更新（`docker compose up -d --force-recreate`）、思わぬ終了があっても、動いていたゲートウェイは保たれます。cont-init の調整役が `$HERMES_HOME/profiles/<name>/gateway_state.json` を読み、最後に記録された状態が `running` なら枠を立ち上げ直します。`stopped` が記録され、再起動しても止まったままになるのは、明示的な `hermes gateway stop` だけです。再起動や更新のときにコンテナや s6 が送る SIGTERM は「まだ動いている」として扱われ、自動で立ち上がります。
- プロファイルごとのゲートウェイのログは `$HERMES_HOME/logs/gateways/<profile>/current` に残り（`s6-log` が回転させます）、調整役の動きは起動のたびに `$HERMES_HOME/logs/container-boot.log` へ書き足されます。振り分けの全体像は[ログの行き先](#where-the-logs-go)を参照してください。

コンテナの中の `hermes status` は `Manager: s6 (container supervisor)` と表示します。見守り役の生の様子を見たいときは `/command/s6-svstat /run/service/gateway-<name>` を使ってください（`/command/` が PATH に入るのは見守りの木のプロセスだけなので、`docker exec` から呼ぶときは絶対パスで渡します）。

## 更新する {#upgrading}

最新のイメージを取ってきて、コンテナを作り直します。データのディレクトリは
そのまま残り、コンテナはゲートウェイを始める前に、マウントされた
`$HERMES_HOME/config.yaml` に対して対話なしの設定の移行を行います。
移行が要るときは、Hermes がまず `config.yaml` と `.env` の隣に時刻の入ったバックアップを書きます。

```sh
docker pull nousresearch/hermes-agent:latest
docker rm -f hermes
docker run -d \
  --name hermes \
  --restart unless-stopped \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

Docker Compose ならこうです。

```sh
docker compose pull
docker compose up -d
```

`HERMES_SKIP_CONFIG_MIGRATION=1` は、新しいイメージに書き換えさせる前に、保存された設定を自分で確かめたり移行したりする必要があるときだけ設定してください。

## スキルと資格情報のファイル {#skills-and-credential-files}

Docker を実行の場として使うとき（上で説明した使い方ではなく、エージェントが Docker のサンドボックスの中でコマンドを実行する場合です。[設定 → Docker バックエンド](/hermes/docs/user-guide/configuration/#docker-backend)を参照してください）、Hermes はすべてのツールの呼び出しで 1 つの長生きするコンテナを使い回し、スキルのディレクトリ（`~/.hermes/skills/`）と、スキルが宣言した資格情報のファイルを、そのコンテナへ読み取り専用のボリュームとして自動でマウントします。スキルのスクリプト・ひな形・資料は、何も設定しなくてもサンドボックスの中で使えます。コンテナは Hermes のプロセスが生きているあいだ残るので、入れた依存も書いたファイルも、次のツールの呼び出しまでそのままです。

同じ同期は SSH と Modal のバックエンドでも行われます。スキルと資格情報のファイルは、コマンドごとに rsync か Modal のマウント API で送られます。

## コンテナに道具を足す {#installing-more-tools-in-the-container}

公式のイメージには選りすぐりの道具が入っていますが（[Dockerfile が何をしているか](#what-the-dockerfile-does)を参照してください）、エージェントが使いたがるすべての道具が最初から入っているわけではありません。手間と長持ちの度合いが増える順に、勧められる方法が 5 つあります。

### npm や Python の道具 — `npx` か `uvx` を使う {#npm-or-python-tools-use-npx-or-uvx}

npm や PyPI で公開されている道具なら、`npx`（npm）か `uvx`（Python）で実行するよう Hermes に伝え、そのコマンドを記憶に残させてください。設定ファイルや資格情報が要る道具なら、それらを `/opt/data` の下（たとえば `/opt/data/<tool>/config.yaml`）に置くよう指示します。

依存は必要になったときに取ってきて、コンテナが生きているあいだキャッシュされます。`/opt/data` の下に書いた設定は、マウントされたホストのディレクトリにあるので、コンテナを再起動しても残ります。パッケージのキャッシュそのものは `docker rm` のあとに作り直されますが、`npx` と `uvx` は次に道具を動かすときに黙って取り直します。

### そのほかの道具（apt のパッケージ、実行ファイル） — 入れて覚えさせる {#other-tools-apt-packages-binaries-install-and-remember}

npm や PyPI の外にあるもの（`apt` のパッケージ、作り置きの実行ファイル、イメージにまだない言語の実行環境）は、入れ方を Hermes に教え（たとえば `apt-get update && apt-get install -y <package>`）、その導入のコマンドを覚えるよう伝えてください。道具はそのコンテナが生きているあいだ残り、コンテナを再起動したあとに必要になれば、Hermes が導入のコマンドを実行し直します。

これは、すぐ入れられて、たまに使う道具に向いています。いつも使う道具には、次の方法のほうが向きます。

### 長持ちさせる — 派生イメージを作る {#durable-installs-build-a-derived-image}

コンテナが立ち上がるたびに、入れ直しの待ち時間なしですぐ使えなければならない道具は、`nousresearch/hermes-agent` を継いだ新しいイメージを作り、その道具を層として入れてください。

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

入口のスクリプトと `/opt/data` の扱いはそのまま受け継がれるので、このページの残りもそのまま当てはまります。上流の `nousresearch/hermes-agent` の新しい版を取ってきたら、イメージを作り直すのを忘れないでください。

### 込み入った道具や、複数のサービスの組み合わせ — サイドカーのコンテナを動かす {#complex-tools-or-multi-service-stacks-run-a-sidecar-container}

自分のサービスを連れてくる道具（データベース、Web サーバー、キュー、画面のないブラウザの群れ）や、Hermes のコンテナに置くには重すぎる道具は、共有の Docker のネットワークの上で別のコンテナとして動かしてください。Hermes は、ローカルの推論サーバーへ届くのと同じやり方で、コンテナ名を使ってサイドカーへ届きます（[ローカルの推論サーバーにつなぐ](#connecting-to-local-inference-servers-vllm-ollama-etc)を参照してください）。

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

Hermes のコンテナの中からは、サイドカーへ `http://my-tool:<port>`（あるいはそれが話すプロトコル）で届きます。この形なら、サービスごとに一生も資源の上限も更新の周期も別々に保てますし、1 つの道具にしか要らない依存で Hermes のイメージをふくらませずに済みます。

### 広く役に立つ道具 — issue か pull request を出す {#broadly-useful-tools-open-an-issue-or-pull-request}

多くの Hermes Agent の利用者に役立ちそうな道具なら、私的な派生イメージで抱え込まず、上流へ寄せることを考えてください。[hermes-agent のリポジトリ](https://github.com/NousResearch/hermes-agent)に issue か pull request を出し、その道具と使いどころを説明します。公式のイメージに取り込まれた道具はすべての利用者の役に立ち、分家を抱え続ける手間も避けられます。

## ローカルの推論サーバーにつなぐ（vLLM、Ollama など） {#connecting-to-local-inference-servers-vllm-ollama-etc}

Hermes を Docker で動かしていて、推論サーバー（vLLM、Ollama、text-generation-inference など）もホストか別のコンテナで動いている場合、ネットワークの扱いに気を配る必要があります。

### Docker Compose（勧められる方法） {#docker-compose-recommended}

両方のサービスを同じ Docker のネットワークに置きます。いちばん確実なやり方です。

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

そのうえで `~/.hermes/config.yaml` では、ホスト名に**コンテナ名**を使います。

```yaml
model:
  provider: custom
  model: my-model
  base_url: http://vllm:8000/v1
  api_key: "none"
```

:::tip 押さえどころ
- ホスト名には**コンテナ名**（`vllm`）を使ってください。`localhost` や `127.0.0.1` は Hermes のコンテナ自身を指してしまいます。
- `model` の値は、vLLM に渡した `--served-model-name` と一致していなければなりません。
- `api_key` には空でない好きな文字列を入れます（vLLM はヘッダを求めますが、既定では中身を確かめません）。
- `base_url` の末尾にスラッシュを**付けない**でください。
:::

### 単独の docker run（Compose なし） {#standalone-docker-run-no-compose}

推論サーバーが（Docker ではなく）ホストで直接動いているなら、macOS と Windows では `host.docker.internal` を、Linux では `--network host` を使います。

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

:::warning `--network host` を使うと `-p` のフラグは無視され、コンテナのポートはすべてそのままホストに出ます。
:::

### つながっているか確かめる {#verifying-connectivity}

Hermes のコンテナの中から、推論サーバーへ届くことを確かめます。

```sh
docker exec hermes curl -s http://vllm:8000/v1/models
```

用意しているモデルを並べた JSON の応答が返るはずです。返らないときは、次を確かめてください。

1. 両方のコンテナが同じ Docker のネットワークにいるか（`docker network inspect hermes-net`）
2. 推論サーバーが `127.0.0.1` ではなく `0.0.0.0` で待ち受けているか
3. ポート番号が合っているか

### Ollama {#ollama}

Ollama も同じです。ホストで動いているなら `host.docker.internal:11434`（macOS / Windows）か `127.0.0.1:11434`（`--network host` の Linux）を使います。同じ Docker のネットワークの別のコンテナで動いているなら、こうします。

```yaml
model:
  provider: custom
  model: llama3
  base_url: http://ollama:11434/v1
  api_key: "none"
```

## 困ったときは {#troubleshooting}

### コンテナがすぐ終わってしまう {#container-exits-immediately}

`docker logs hermes` でログを見てください。よくある原因はこれです。
- `.env` のファイルがない、または壊れている — まず対話的に動かして設定を済ませてください
- ポートを公開しているとき、ポートがぶつかっている

### 「Permission denied」のエラーが出る {#permission-denied-errors}

コンテナの stage2 のフックは、見守られる各サービスの中で `s6-setuidgid` を使い、root でない `hermes` ユーザー（UID 10000）へ権限を落とします。ホストの `~/.hermes/` が別の UID の持ち物なら、`HERMES_UID` と `HERMES_GID`（LinuxServer.io や NAS のイメージに合わせた `PUID` と `PGID` という別名でも構いません）をホストのユーザーに合わせるか、データのディレクトリを書き込めるようにしてください。

```sh
chmod -R 755 ~/.hermes
```

NAS（UGOS、Synology、unRAID）では、データのディレクトリはたいてい、コンテナからは `chown` できないホストの UID が持つ**マウント**です。UID 10000 ではなくマウントの持ち主として動くよう、`PUID` と `PGID`（または `HERMES_UID` と `HERMES_GID`）をそのホストのユーザーに合わせてください。

```sh
docker run -d \
  --name hermes \
  -e PUID=1000 -e PGID=10 \
  -v /volume1/docker/hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

`docker exec hermes <cmd>` も自動で UID 10000 へ落ちます。詳しいことと、実行ごとに外す方法は [`docker exec` は自動で `hermes` ユーザーへ落ちます](#docker-exec-automatically-drops-to-the-hermes-user)を参照してください。

### どの `docker exec` でも「Permission denied」になる（インストール先が 0700 で閉じている） {#permission-denied-on-every-docker-exec-install-dir-locked-to-0700}

2026 年 8 月下旬より前に作られたイメージには、資格情報のファイルを `/opt/hermes` の直下に書くとそのディレクトリが `0700` に絞られ、`hermes` ユーザー（UID 10000）がインストール先から締め出されるという不具合がありました。以降、新しい `docker exec` はすべて `Permission denied` で失敗します。

新しいイメージを取ってきてコンテナを作り直せば、恒久的に直ります（インストール先は `0755` で届き、いまの版はもう絞りません）。作り直さずに、動いているコンテナをその場で立て直したいときはこうします。

```sh
docker exec -u root hermes chmod 0755 /opt/hermes
```

### ブラウザの道具が動かない {#browser-tools-not-working}

Playwright には共有メモリが要ります。docker run のコマンドに `--shm-size=1g` を足してください。

```sh
docker run -d \
  --name hermes \
  --shm-size=1g \
  -v ~/.hermes:/opt/data \
  nousresearch/hermes-agent gateway run
```

### ネットワークの不調のあと、ゲートウェイがつなぎ直せない {#gateway-not-reconnecting-after-network-issues}

`--restart unless-stopped` のフラグが、一時的な失敗のほとんどを引き受けます。それでもゲートウェイが動かなくなっているなら、コンテナを再起動してください。

```sh
docker restart hermes
```

### コンテナの様子を確かめる {#checking-container-health}

```sh
docker logs --tail 50 hermes          # Recent logs
docker run -it --rm nousresearch/hermes-agent:latest version     # Verify version
docker stats hermes                    # Resource usage
```
