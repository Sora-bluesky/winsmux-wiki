---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "外向き通信の分離（Docker）"
description: "Docker ネットワークを分割し、エージェントのサンドボックスが許可したホストにだけ接続できるようにする"
upstream_path: user-guide/egress/network-isolation.md
upstream_blob: 3c81ade84724d0e333a1999c33f6a1cabd297088
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/egress/network-isolation
---

# Docker で運用するときの外向き通信の分離 {#network-egress-isolation-for-docker-deployments}

Docker 内で Hermes を動かす場合、既定の `network_mode: host` では、エージェントの
プロセスが外部へ無制限に通信できます。このガイドでは、通信を分割して、エージェント本体が
必要なサービスにだけ接続でき、それ以外の任意の外向き接続は遮断される構成を紹介します。

これは主に、ツールが生成したシェルコマンドから `curl`、`wget`、または生の HTTP で
データを持ち出そうとするプロンプトインジェクション攻撃への防御です。

## 脅威モデル {#threat-model}

Hermes の [SECURITY.md](https://github.com/NousResearch/hermes-agent/blob/main/SECURITY.md) の §2 が信頼モデルを定めています。
ターミナルのバックエンドが主な実行境界です。しかし `network_mode: host` で動かしていると、
エージェントが実行するどのコマンドも、外部を含むネットワーク上のあらゆる接続先に届いてしまいます。

外向き通信の分離は、2 つ目の防御層を加えます。悪意のあるコマンドがコンテナ内で
実行されても、明示的に許可した接続先以外には届きません。

## 構成 {#architecture}

```
┌─────────────────────────────────────────────┐
│  Docker Network: internal (no internet)     │
│                                             │
│   ┌──────────────┐   ┌──────────────────┐   │
│   │ hermes-agent │   │ hermes-dashboard │   │
│   └──────┬───────┘   └────────┬─────────┘   │
│          │                    │              │
│          ▼                    │              │
│   ┌──────────────┐            │              │
│   │ hermes-gtw   │◄───────────┘              │
│   └──────┬───────┘                           │
│          │                                   │
└──────────┼───────────────────────────────────┘
           │
┌──────────┼───────────────────────────────────┐
│  Docker Network: egress (internet-capable)   │
│          │                                   │
│          ▼                                   │
│   ┌─────────────────┐                        │
│   │ egress-proxy     │──► allowlisted hosts  │
│   │ (squid / envoy)  │                       │
│   └─────────────────┘                        │
└──────────────────────────────────────────────┘
```

Docker ネットワークは 2 つです。

- **`internal`** — デフォルトルートがなく、インターネットに出られません。エージェント、ダッシュボード、
  ゲートウェイはここで動きます。
- **`egress`** — インターネットに出られます。外部の API に接続する必要があるサービスだけを
  このネットワークにつなぎます。

ゲートウェイのサービスは両方のネットワークにつながっています。これにより、Telegram や Slack などから
届くメッセージを受け取り、internal ネットワーク上のエージェントへ転送できます。

## Compose の設定 {#compose-configuration}

既定の `docker-compose.yml` を、
`docker-compose.override.yml` で上書きします。

```yaml
# docker-compose.override.yml
# Network egress isolation for production deployments.
#
# Usage:
#   HERMES_UID=$(id -u) HERMES_GID=$(id -g) docker compose up -d
#
# This overrides network_mode: host with isolated Docker networks.

networks:
  internal:
    driver: bridge
    internal: true          # no default route, no internet
  egress:
    driver: bridge

services:
  gateway:
    network_mode: ""        # clear the host-mode default
    networks:
      - internal
      - egress              # needs outbound for Telegram, LLM APIs
    ports:
      - "127.0.0.1:9119:9119"   # dashboard proxy, localhost only

  dashboard:
    network_mode: ""
    networks:
      - internal            # internal only, no egress needed
```

### 外向きプロキシを使う場合（推奨） {#with-an-egress-proxy-recommended}

より厳しく制御するには、すべての外向き通信を、許可リストを明示した HTTP プロキシ経由に
します。

```yaml
# docker-compose.override.yml (with egress proxy)

networks:
  internal:
    driver: bridge
    internal: true
  egress:
    driver: bridge

services:
  gateway:
    network_mode: ""
    networks:
      - internal
      - egress
    environment:
      - HTTP_PROXY=http://egress-proxy:3128
      - HTTPS_PROXY=http://egress-proxy:3128
      - NO_PROXY=hermes,hermes-dashboard,localhost

  dashboard:
    network_mode: ""
    networks:
      - internal

  egress-proxy:
    image: ubuntu/squid:6.10-24.04_edge
    networks:
      - egress
    volumes:
      - ./config/squid-allowlist.conf:/etc/squid/conf.d/allowlist.conf:ro
    restart: unless-stopped
```

`config/squid-allowlist.conf` の例です。

```
# Only allow HTTPS CONNECT to these hosts
acl allowed_hosts dstdomain api.openai.com
acl allowed_hosts dstdomain api.anthropic.com
acl allowed_hosts dstdomain openrouter.ai
acl allowed_hosts dstdomain generativelanguage.googleapis.com
acl allowed_hosts dstdomain api.telegram.org
acl allowed_hosts dstdomain api.github.com
acl allowed_hosts dstdomain discord.com

http_access allow CONNECT allowed_hosts
http_access deny all
```

許可リストは、使っている LLM プロバイダーとメッセージングプラットフォームに合わせて調整してください。

## 設定を確かめる {#validating-the-setup}

スタックを起動したら、分離できているかを確認します。

```bash
# From the agent container: this should FAIL (no egress)
docker compose exec gateway \
  curl -sf --max-time 5 https://example.com && echo "FAIL: egress not blocked" || echo "OK: egress blocked"

# From the agent container: this should SUCCEED (internal network)
docker compose exec gateway \
  curl -sf --max-time 5 http://hermes-dashboard:9119/health && echo "OK: internal reachable" || echo "FAIL"

# If using egress proxy: this should SUCCEED (allowlisted)
docker compose exec gateway \
  curl -sf --max-time 5 --proxy http://egress-proxy:3128 https://api.openai.com/v1/models && echo "OK" || echo "FAIL"
```

## 制限事項 {#limitations}

- **DNS の名前解決:** 外部への問い合わせを遮断するローカルの DNS リゾルバーを別途動かさない限り、
  `internal` ネットワークからも外部の DNS 名は解決できます。
  名前解決だけで意味のあるデータが持ち出されることはないため、ほとんどの脅威モデルでは
  これで問題ありません。

- **サンドボックスのバックエンドの代わりにはなりません:** このガイドで分離するのは、エージェントの
  *コンテナの*ネットワークです。既定のローカルのターミナルバックエンドを使っている場合、ツールの
  コマンドは同じコンテナ内で実行されます。より強く分離するには、ネットワークの分割と、
  サンドボックス化されたターミナルバックエンド（Docker、Modal、Daytona）を組み合わせてください。

- **プラットフォームアダプターには外向き通信が必要です:** ゲートウェイのサービスは、
  メッセージングプラットフォームの API に接続するために外向きの通信が必要です。プラットフォーム
  アダプターを追加した場合は、その API の接続先をプロキシの許可リストに加えてください。

## 関連 {#related}

- [SECURITY.md](https://github.com/NousResearch/hermes-agent/blob/main/SECURITY.md) — Hermes の信頼モデルと脆弱性の報告方法
- [Docker](/hermes/docs/user-guide/docker/) — コンテナで Hermes を動かす
- [外向きプロキシ](/hermes/docs/user-guide/egress/iron-proxy/) — サンドボックス向けの、認証情報を注入するファイアウォール
- [docker-compose.yml](https://github.com/NousResearch/hermes-agent/blob/main/docker-compose.yml) — 既定の compose 設定
