---
title: Docker
description: コンテナで隔離して動かす形。壊されたくないものと Hermes の間に壁を作る。
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/docker
  - https://hermes-agent.nousresearch.com/docs/user-guide/security
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/entities/docker.md
---

# Docker

Docker はコンテナで隔離して動かす形です。Hermes がコマンドを実行する場所をコンテナの中に閉じ込めるので、間違いが起きてもマシン本体には届きにくくなります。

丸ごとコンテナで動かす形と、Hermes 本体は外に置いてコマンド実行だけをコンテナに入れる形の両方があります。任せる範囲を広げたいときほど、この壁が効きます。

## 公式で読む

- しくみと使い方 — [Docker Backend](https://hermes-agent.nousresearch.com/docs/user-guide/docker)
- 隔離の考え方 — [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)

## このサイトの関連

- [どこまで任せる](/hermes/trust/)
- [ローカル](/hermes/entities/local/)
