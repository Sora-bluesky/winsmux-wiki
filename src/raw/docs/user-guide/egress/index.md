---
title: "Egress プロキシ"
description: ""
upstream_path: user-guide/egress/index.md
upstream_blob: 90ccbb8a05e663ba816b4ac1e8bef7bca32eed5b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/egress
---

# Egress プロキシ {#egress-proxy}

リモートのターミナルサンドボックス向けに、外向き通信へ資格情報を差し込むファイアウォールを任意で用意できます。サンドボックス側が持つのは中身のわからないプロキシ用トークンだけで、本物の API キーがホストの外に出ることはありません。

- [iron-proxy](/hermes/docs/user-guide/egress/iron-proxy/) — [ironsh/iron-proxy](https://github.com/ironsh/iron-proxy) が提供する、TLS を横取りする単一バイナリのプロキシです。`hermes egress` が必要になった時点で導入し、そのまま管理します。
