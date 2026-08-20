---
title: "Docker Management — Docker のコンテナ・イメージ・ボリューム・Compose を管理する"
description: "Docker のコンテナ・イメージ・ボリューム・Compose を管理する"
upstream_path: user-guide/skills/optional/devops/devops-docker-management.md
upstream_blob: bc9c60c9c698b68aa592ac92b163eabf65d5eac1
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/devops/devops-docker-management
---

# Docker Management {#docker-management}

Docker のコンテナ・イメージ・ボリューム・Compose を管理します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/devops/docker-management` で導入します |
| パス | `optional-skills/devops/docker-management` |
| バージョン | `1.0.0` |
| 作者 | sprmn24 |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `docker`, `containers`, `devops`, `infrastructure`, `compose`, `images`, `volumes`, `networks`, `debugging` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Docker Management {#docker-management}

標準の Docker CLI コマンドで、コンテナ・イメージ・ボリューム・ネットワーク・Compose のスタックを管理します。Docker 本体のほかに必要なものはありません。

## 使いどころ {#when-to-use}

- コンテナの起動・停止・再起動・削除・中身の確認
- Docker イメージのビルド・pull・push・タグ付け・整理
- Docker Compose（複数サービスのスタック）を扱う
- ボリュームやネットワークの管理
- 落ちるコンテナの原因調べ、ログの分析
- Docker のディスク使用量の確認、空き容量の確保
- Dockerfile の見直しや最適化

## 前提条件 {#prerequisites}

- Docker Engine がインストールされ、動いていること
- ユーザーが `docker` グループに入っていること（または `sudo` を使うこと）
- Docker Compose v2（最近の Docker には同梱されています）

さっと確認するには:

```bash
docker --version && docker compose version
```

## 早見表 {#quick-reference}

| やりたいこと | コマンド |
|------|---------|
| コンテナを起動（バックグラウンド） | `docker run -d --name NAME IMAGE` |
| 停止して削除 | `docker stop NAME && docker rm NAME` |
| ログを見る（追いかける） | `docker logs --tail 50 -f NAME` |
| コンテナの中でシェルを開く | `docker exec -it NAME /bin/sh` |
| 全コンテナの一覧 | `docker ps -a` |
| イメージをビルド | `docker build -t TAG .` |
| Compose の起動 | `docker compose up -d` |
| Compose の停止 | `docker compose down` |
| ディスク使用量 | `docker system df` |
| 宙に浮いたものを掃除 | `docker image prune && docker container prune` |

## 手順 {#procedure}

### 1. どの領域の話か見極める {#1-identify-the-domain}

依頼がどの領域に当たるかを整理します:

- **コンテナのライフサイクル** → run、stop、start、restart、rm、pause/unpause
- **コンテナとのやり取り** → exec、cp、logs、inspect、stats
- **イメージの管理** → build、pull、push、tag、rmi、save/load
- **Docker Compose** → up、down、ps、logs、exec、build、config
- **ボリュームとネットワーク** → create、inspect、rm、prune、connect
- **困りごとの調査** → ログの分析、終了コード、リソースの問題

### 2. コンテナの操作 {#2-container-operations}

**新しいコンテナを起動する:**

```bash
# Detached service with port mapping
docker run -d --name web -p 8080:80 nginx

# With environment variables
docker run -d -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=mydb --name db postgres:16

# With persistent data (named volume)
docker run -d -v pgdata:/var/lib/postgresql/data --name db postgres:16

# For development (bind mount source code)
docker run -d -v $(pwd)/src:/app/src -p 3000:3000 --name dev my-app

# Interactive debugging (auto-remove on exit)
docker run -it --rm ubuntu:22.04 /bin/bash

# With resource limits and restart policy
docker run -d --memory=512m --cpus=1.5 --restart=unless-stopped --name app my-app
```

主なフラグ: `-d` はバックグラウンド、`-it` は対話+tty、`--rm` は終了時に自動削除、`-p` はポート（ホスト:コンテナ）、`-e` は環境変数、`-v` はボリューム、`--name` は名前、`--restart` は再起動の方針です。

**動いているコンテナを扱う:**

```bash
docker ps                        # running containers
docker ps -a                     # all (including stopped)
docker stop NAME                 # graceful stop
docker start NAME                # start stopped container
docker restart NAME              # stop + start
docker rm NAME                   # remove stopped container
docker rm -f NAME                # force remove running container
docker container prune           # remove ALL stopped containers
```

**コンテナとやり取りする:**

```bash
docker exec -it NAME /bin/sh          # shell access (use /bin/bash if available)
docker exec NAME env                   # view environment variables
docker exec -u root NAME apt update    # run as specific user
docker logs --tail 100 -f NAME         # follow last 100 lines
docker logs --since 2h NAME            # logs from last 2 hours
docker cp NAME:/path/file ./local      # copy file from container
docker cp ./file NAME:/path/           # copy file to container
docker inspect NAME                    # full container details (JSON)
docker stats --no-stream               # resource usage snapshot
docker top NAME                        # running processes
```

### 3. イメージの管理 {#3-image-management}

```bash
# Build
docker build -t my-app:latest .
docker build -t my-app:prod -f Dockerfile.prod .
docker build --no-cache -t my-app .              # clean rebuild
DOCKER_BUILDKIT=1 docker build -t my-app .       # faster with BuildKit

# Pull and push
docker pull node:20-alpine
docker login ghcr.io
docker tag my-app:latest registry/my-app:v1.0
docker push registry/my-app:v1.0

# Inspect
docker images                          # list local images
docker history IMAGE                   # see layers
docker inspect IMAGE                   # full details

# Cleanup
docker image prune                     # remove dangling (untagged) images
docker image prune -a                  # remove ALL unused images (careful!)
docker image prune -a --filter "until=168h"   # unused images older than 7 days
```

### 4. Docker Compose {#4-docker-compose}

```bash
# Start/stop
docker compose up -d                   # start all services detached
docker compose up -d --build           # rebuild images before starting
docker compose down                    # stop and remove containers
docker compose down -v                 # also remove volumes (DESTROYS DATA)

# Monitoring
docker compose ps                      # list services
docker compose logs -f api             # follow logs for specific service
docker compose logs --tail 50          # last 50 lines all services

# Interaction
docker compose exec api /bin/sh        # shell into running service
docker compose run --rm api npm test   # one-off command (new container)
docker compose restart api             # restart specific service

# Validation
docker compose config                  # validate and view resolved config
```

**最小限の compose.yml の例:**

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### 5. ボリュームとネットワーク {#5-volumes-and-networks}

```bash
# Volumes
docker volume ls                       # list volumes
docker volume create mydata            # create named volume
docker volume inspect mydata           # details (mount point, etc.)
docker volume rm mydata                # remove (fails if in use)
docker volume prune                    # remove unused volumes

# Networks
docker network ls                      # list networks
docker network create mynet            # create bridge network
docker network inspect mynet           # details (connected containers)
docker network connect mynet NAME      # attach container to network
docker network disconnect mynet NAME   # detach container
docker network rm mynet                # remove network
docker network prune                   # remove unused networks
```

### 6. ディスク使用量と掃除 {#6-disk-usage-and-cleanup}

掃除の前に、必ずまず現状を調べます:

```bash
# Check what's using space
docker system df                       # summary
docker system df -v                    # detailed breakdown

# Targeted cleanup (safe)
docker container prune                 # stopped containers
docker image prune                     # dangling images
docker volume prune                    # unused volumes
docker network prune                   # unused networks

# Aggressive cleanup (confirm with user first!)
docker system prune                    # containers + images + networks
docker system prune -a                 # also unused images
docker system prune -a --volumes       # EVERYTHING — named volumes too
```

**注意:** `docker system prune -a --volumes` は、ユーザーに確認せずに実行してはいけません。大事なデータが入っているかもしれない名前付きボリュームまで消えます。

## つまずきどころ {#pitfalls}

| 症状 | 原因 | 対処 |
|---------|-------|-----|
| コンテナがすぐ終了する | メインのプロセスが終わったか落ちた | `docker logs NAME` を確認し、`docker run -it --entrypoint /bin/sh IMAGE` を試す |
| 「port is already allocated」 | 別のプロセスがそのポートを使っている | `docker ps` か `lsof -i :PORT` で見つける |
| 「no space left on device」 | Docker のディスクがいっぱい | `docker system df` を見てから、狙いを定めて prune する |
| コンテナに繋がらない | アプリがコンテナの中で 127.0.0.1 を待ち受けている | アプリは `0.0.0.0` を待ち受ける必要がある。`-p` の対応も確認する |
| ボリュームで permission denied | ホストとコンテナで UID/GID が食い違っている | `--user $(id -u):$(id -g)` を使うか、パーミッションを直す |
| Compose のサービス同士が繋がらない | ネットワークかサービス名が違う | サービス名がホスト名になる。`docker compose config` を確認する |
| ビルドのキャッシュが効かない | Dockerfile のレイヤーの順番が悪い | 変わりにくいレイヤーを先に置く（ソースより先に依存関係） |
| イメージが大きすぎる | マルチステージビルドと .dockerignore がない | マルチステージビルドを使い、`.dockerignore` を足す |

## 検証 {#verification}

Docker の操作をしたら、毎回結果を確かめます:

- **コンテナは起動したか?** → `docker ps`（状態が「Up」か確認）
- **ログはきれいか?** → `docker logs --tail 20 NAME`（エラーが出ていないか）
- **ポートに繋がるか?** → `curl -s http://localhost:PORT` または `docker port NAME`
- **イメージはできたか?** → `docker images | grep TAG`
- **Compose のスタックは健全か?** → `docker compose ps`（全サービスが「running」か「healthy」か）
- **容量は空いたか?** → `docker system df`（前後を見比べる）

## Dockerfile を良くするコツ {#dockerfile-optimization-tips}

Dockerfile を見直したり新しく書いたりするときは、次の改善を提案してください:

1. **マルチステージビルド** — ビルド用の環境と実行環境を分けて、最終的なイメージを小さくします
2. **レイヤーの順番** — 依存関係をソースコードより先に置いて、変更でキャッシュが無効にならないようにします
3. **RUN をまとめる** — レイヤーが減り、イメージが小さくなります
4. **.dockerignore を使う** — `node_modules`、`.git`、`__pycache__` などを除きます
5. **ベースイメージのバージョンを固定する** — `node:latest` ではなく `node:20-alpine` にします
6. **root 以外で動かす** — 安全のために `USER` の指定を足します
7. **slim や alpine のベースを使う** — `python:3.12` ではなく `python:3.12-slim` にします
