---
title: "Microsoft Teams"
description: "Hermes Agent を Microsoft Teams のボットとして設定する"
upstream_path: user-guide/messaging/teams.md
upstream_blob: d64efd8a03fef051f0978c4eb6ee74b3cc9dc11e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/teams
---

# Microsoft Teams の設定 {#microsoft-teams-setup}

Hermes Agent を Microsoft Teams のボットとしてつなぎます。Slack の Socket Mode とは違い、Teams は**公開された HTTPS の webhook** を呼び出す形でメッセージを届けます。そのため、外部から到達できるエンドポイントが必要です。手元で試すなら開発用トンネル、本番なら実際のドメインを用意します。

ふつうのボット会話ではなく、Microsoft Graph のイベントから会議の要約を受け取りたい場合は、専用の設定ページを見てください: [Teams Meetings](/hermes/docs/user-guide/messaging/teams-meetings/)。

> `hermes gateway setup` を実行して **Microsoft Teams** を選ぶと、手順を案内してもらえます。

## ボットが応答する条件 {#how-the-bot-responds}

| 場面 | 挙動 |
|---------|----------|
| **個人チャット（DM）** | すべてのメッセージに応答します。@メンションは不要です。 |
| **グループチャット** | @メンションされたときだけ応答します。 |
| **チャネル** | @メンションされたときだけ応答します。 |

Teams は @メンションを `<at>BotName</at>` タグ付きの通常メッセージとして届けます。Hermes は処理の前にこのタグを自動で取り除きます。

---

ソースから入れる場合やローカルにインストールする場合は、同梱のアダプターを使えるように Teams の extra を入れてください。

```bash
uv sync --extra teams
# or, for editable installs:
uv pip install -e ".[teams]"
```

## ステップ 1: Teams CLI をインストールする {#step-1-install-the-teams-cli}

`@microsoft/teams.cli` がボットの登録を自動でやってくれるので、Azure ポータルを触る必要はありません。

```bash
npm install -g @microsoft/teams.cli@preview
teams login
```

ログインの確認と、自分の AAD オブジェクト ID（`TEAMS_ALLOWED_USERS` に必要です）の確認は次のコマンドで行います。

```bash
teams status --verbose
```

---

## ステップ 2: webhook のポートを公開する {#step-2-expose-the-webhook-port}

Teams は `localhost` にメッセージを届けられません。手元で開発するときは、好きなトンネルツールで公開 HTTPS URL を用意します。既定のポートは `3978` で、変えたい場合は `TEAMS_PORT` で指定します。

```bash
# devtunnel (Microsoft)
devtunnel create hermes-bot --allow-anonymous
devtunnel port create hermes-bot -p 3978 --protocol http  # replace 3978 with TEAMS_PORT if changed
devtunnel host hermes-bot

# ngrok
ngrok http 3978  # replace 3978 with TEAMS_PORT if changed

# cloudflared
cloudflared tunnel --url http://localhost:3978  # replace 3978 with TEAMS_PORT if changed
```

出力された `https://` の URL をコピーします。次のステップで使います。開発中はトンネルを起動したままにしてください。

公開トンネルの URL は HTTPS ですが、Hermes 側で webhook を待ち受けるのはプレーンな HTTP です。TLS はトンネルで終端され、HTTP としてポート `3978` に転送されます。ローカル側のトンネルポートを HTTPS として設定しないでください。

本番では、ボットのエンドポイントを自分のサーバーの公開ドメインに向けます（[本番環境へのデプロイ](#production-deployment)を参照）。

---

## ステップ 3: ボットを作成する {#step-3-create-the-bot}

```bash
teams app create \
  --name "Hermes" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

CLI が `CLIENT_ID`、`CLIENT_SECRET`、`TENANT_ID` と、ステップ 6 で使うインストール用リンクを出力します。クライアントシークレットは二度と表示されないので、必ず保存してください。

---

## ステップ 4: 環境変数を設定する {#step-4-configure-environment-variables}

`~/.hermes/.env` に次を追記します。

```bash
# Required
TEAMS_CLIENT_ID=<your-client-id>
TEAMS_CLIENT_SECRET=<your-client-secret>
TEAMS_TENANT_ID=<your-tenant-id>

# Restrict access to specific users (recommended)
# Use AAD object IDs from `teams status --verbose`
TEAMS_ALLOWED_USERS=<your-aad-object-id>
```

---

## ステップ 5: ゲートウェイを起動する {#step-5-start-the-gateway}

**Docker** の場合（`docker-compose.yml` があるディレクトリで実行してください。ふつうは `~` ではなく、クローンした `hermes-agent` のリポジトリです）:

```bash
cd /path/to/hermes-agent
HERMES_UID=$(id -u) HERMES_GID=$(id -g) docker compose up -d gateway
```

**ネイティブ / systemd インストール** の場合（`hermes` のワンライナーインストーラーで `~/.hermes/hermes-agent` に入れた形）:

```bash
hermes gateway restart
# or foreground: hermes gateway run
```

Teams SDK は任意です。Teams を有効にしておくと、初回起動時にゲートウェイが Hermes 専用の venv へ遅延インストールします（Ubuntu 24.04 でシステムの `pip install` を使うのは避けてください。PEP 668 の `externally-managed-environment` に引っかかります）。手動で Hermes の venv に入れるには次のようにします。

```bash
~/.hermes/hermes-agent/venv/bin/pip install microsoft-teams-apps aiohttp
# or from a clone of the agent: uv sync --extra teams
```

webhook の既定ポートは `3978` です（`TEAMS_PORT` で変更できます）。動いているかどうかは次で確認します。

```bash
curl http://localhost:3978/health   # should return: ok
# Docker:
docker logs -f hermes
# Native:
hermes gateway status -l
```

次の行が出ていれば大丈夫です。
```
[teams] Webhook server listening on * (all interfaces, IPv4+IPv6):3978/api/messages
```

---

## ステップ 6: Teams にアプリを入れる {#step-6-install-the-app-in-teams}

```bash
teams app get <teamsAppId> --install-link
```

表示されたリンクをブラウザーで開くと、そのまま Teams クライアントが立ち上がります。インストールが終わったらボットにダイレクトメッセージを送ってみてください。これで使えます。

---

## 設定の一覧 {#configuration-reference}

### 環境変数 {#environment-variables}

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_CLIENT_ID` | Azure AD アプリの（クライアント）ID |
| `TEAMS_CLIENT_SECRET` | Azure AD のクライアントシークレット |
| `TEAMS_TENANT_ID` | Azure AD のテナント ID |
| `TEAMS_ALLOWED_USERS` | ボットの利用を許可する AAD オブジェクト ID（カンマ区切り） |
| `TEAMS_ALLOW_ALL_USERS` | `true` にすると許可リストを飛ばして誰でも使えるようになります |
| `TEAMS_HOME_CHANNEL` | 定期実行やプロアクティブなメッセージの届け先となる会話 ID |
| `TEAMS_HOME_CHANNEL_NAME` | ホームチャンネルの表示名 |
| `TEAMS_PORT` | webhook のポート（既定: `3978`） |

### config.yaml {#configyaml}

`~/.hermes/config.yaml` から設定することもできます。

```yaml
platforms:
  teams:
    enabled: true
    extra:
      client_id: "your-client-id"
      client_secret: "your-secret"
      tenant_id: "your-tenant-id"
      port: 3978
```

---

## 機能 {#features}

### 承認カード {#interactive-approval-cards}

危険をともなうかもしれないコマンドを実行するとき、エージェントは `/approve` と打たせる代わりに、4 つのボタンを持つアダプティブカードを送ります。

- **Allow Once** — このコマンドだけを承認します
- **Allow Session** — このセッションの間、同じパターンを承認します
- **Always Allow** — このパターンを恒久的に承認します
- **Deny** — コマンドを却下します

ボタンを押すとその場で承認が決まり、カードは決定の内容に置き換わります。

### 会議要約の配信（Teams 会議パイプライン） {#meeting-summary-delivery-teams-meeting-pipeline}

[Teams 会議パイプラインのプラグイン](/hermes/docs/user-guide/messaging/msgraph-webhook/)を有効にすると、このアダプターが会議要約の送信も担当します。Teams との接点は 2 つに分かれず、1 つのままです。会議の文字起こしが要約されたあと、書き出し側が指定の Teams の宛先へ要約を投稿します。

パイプラインの要約配信は、ボットの設定と同じ `teams` プラットフォームの項目の下で設定します。

```yaml
platforms:
  teams:
    enabled: true
    extra:
      # existing bot config (client_id, client_secret, tenant_id, port) ...

      # Meeting summary delivery (only used when the teams_pipeline plugin is enabled)
      delivery_mode: "graph"       # or "incoming_webhook"
      # For delivery_mode: graph — pick ONE of:
      chat_id: "19:meeting_..."    # post into a Teams chat
      # team_id: "..."             # OR post into a channel
      # channel_id: "..."
      # access_token: "..."        # optional; falls back to MSGRAPH_* app credentials
      # For delivery_mode: incoming_webhook:
      # incoming_webhook_url: "https://outlook.office.com/webhook/..."
```

| モード | 向いている場面 | トレードオフ |
|------|----------|-----------|
| `incoming_webhook` | Teams が生成した固定 URL を使って「このチャネルに要約を投稿する」だけを済ませたいとき。 | 返信のスレッド化やリアクションはできず、webhook に設定された名義で表示されます。 |
| `graph` | Microsoft Graph 経由で、ボット名義のスレッド付きチャネル投稿や 1 対 1・グループチャットへの投稿をしたいとき。 | [Graph のアプリ登録](/hermes/docs/guides/microsoft-graph-app-registration/)が必要で、アプリケーション権限として `ChannelMessage.Send`（チャネル）または `Chat.ReadWrite.All`（チャット）を与えます。 |

`teams_pipeline` プラグインを有効にしていない場合、これらの設定は何もしません。パイプラインのランタイムが Graph webhook の受け口に結びついたときだけ効いてきます。

---

## 本番環境へのデプロイ {#production-deployment}

常時稼働のサーバーでは、TLS をリバースプロキシで終端し、プレーンな HTTP で待ち受ける Hermes（通常は `http://127.0.0.1:3978`）へ転送します。プロキシ側の公開 HTTPS エンドポイントを Teams に登録してください。

```bash
teams app create \
  --name "Hermes" \
  --endpoint "https://your-domain.com/api/messages"
```

すでにボットを作ってあって、エンドポイントだけ更新したい場合は次のようにします。

```bash
teams app update --id <teamsAppId> --endpoint "https://your-domain.com/api/messages"
```

公開 HTTPS エンドポイントがインターネットから到達でき、有効な TLS 証明書を使っていることを確かめてください。Teams は自己署名証明書を受け付けません。Hermes 側はプロキシの後ろに置いたままにします。ポート `3978` 自身は HTTPS を話しません。

---

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| `docker compose` が `Can't find a suitable configuration file` を返す | `docker-compose.yml` のあるリポジトリにいないか、ネイティブインストールを使っています。代わりに `hermes gateway restart` を使うか、先にクローンへ `cd` してください |
| `requirements not met` / `Teams SDK missing` / `No adapter available for teams` | ゲートウェイを再起動して遅延インストールを走らせるか、**Hermes の venv** へ入れてください: `~/.hermes/hermes-agent/venv/bin/pip install microsoft-teams-apps aiohttp`。システムの `pip` は Ubuntu 24.04 では失敗し（PEP 668）、そもそもサービス側には反映されません |
| `health` は返るのにボットが応答しない | トンネルがまだ動いているか、ボットのメッセージングエンドポイントがトンネルの URL と一致しているか確かめてください |
| Teams からメッセージが来たときログに `"UNKNOWN / HTTP/1.0" 400` が出る | トンネルかリバースプロキシが、HTTPS のまま Hermes のプレーン HTTP へ転送しています。TLS はプロキシで終端し、HTTP としてポート `3978` へ転送してください |
| ログに `KeyError: 'teams'` が出る | コンテナーを再起動してください。現行バージョンでは修正済みです |
| ボットが認証エラーを返す | `TEAMS_CLIENT_ID`、`TEAMS_CLIENT_SECRET`、`TEAMS_TENANT_ID` がすべて正しく設定されているか確かめてください |
| `No inference provider configured` | `~/.hermes/.env` に `ANTHROPIC_API_KEY`（または他のプロバイダーのキー）が設定されているか確かめてください |
| メッセージは届くのに無視される | 自分の AAD オブジェクト ID が `TEAMS_ALLOWED_USERS` に入っていない可能性があります。`teams status --verbose` で確認してください |
| 再起動のたびにトンネルの URL が変わる | devtunnel は名前付きトンネル（`devtunnel create hermes-bot`）にすれば URL が固定されます。ngrok と cloudflared は有料プランでない限り実行ごとに新しい URL になるので、変わったら `teams app update` でボットのエンドポイントを更新してください |
| Teams に「このボットは応答していません」と出る | webhook がエラーを返しています。`docker logs hermes` か `hermes gateway status -l` でトレースバックを確認してください |
| ログに `[teams] Failed to connect` が出る | SDK の認証に失敗しています。認証情報と、テナント ID が `teams login` で使ったアカウントと一致しているかを見直してください |

---

## セキュリティ {#security}

:::warning
**`TEAMS_ALLOWED_USERS` は必ず設定してください。** 利用を許可する人の AAD オブジェクト ID を並べます。設定しないと、ボットを見つけたりインストールできたりする人なら誰でも操作できてしまいます。

`TEAMS_CLIENT_SECRET` はパスワードと同じ扱いにして、Azure ポータルか Teams CLI で定期的に入れ替えてください。
:::

- 認証情報は権限 `600` の `~/.hermes/.env` に置きます（`chmod 600 ~/.hermes/.env`）
- ボットが受け付けるのは `TEAMS_ALLOWED_USERS` にいる人からのメッセージだけで、それ以外は黙って捨てられます
- 公開エンドポイント（`/api/messages`）は Teams Bot Framework によって認証され、正しい JWT のないリクエストは拒否されます

## 関連ドキュメント {#related-docs}

- [Teams Meetings](/hermes/docs/user-guide/messaging/teams-meetings/)
- [Teams 会議パイプラインの運用](/hermes/docs/guides/operate-teams-meeting-pipeline/)
