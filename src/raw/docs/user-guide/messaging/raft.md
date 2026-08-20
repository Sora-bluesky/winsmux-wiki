---
title: "Raft"
description: "wake チャンネルのブリッジ経由で、Hermes Agent を外部エージェントとして Raft につなぐ"
upstream_path: user-guide/messaging/raft.md
upstream_blob: 0e62b1aa749150c29901eff39f7bfe10555fa936
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/raft
---

# Raft の設定 {#raft-setup}

Hermes は、ローカルの wake チャンネルブリッジを通じて、外部エージェントとして [Raft](https://raft.build) につながります。アダプターはループバックの HTTP エンドポイントを立ち上げ、ブリッジから届く「中身のない起動ヒント」を受け取って、Hermes ゲートウェイのセッションパイプラインへ流し込みます。メッセージの読み書きはエージェントが Raft CLI で行い、アダプターはメッセージ本文にも配信カーソルにも一切触れません。

:::info 役割分担
- **ブリッジ**が担うもの: 起動ヒントの受信、重複排除、バックオフ、再接続、少なくとも1回の配信保証、証跡ログ。
- **Hermes アダプター**が担うもの: localhost の起動エンドポイントと、エージェントの文脈へ短い通知を差し込むこと。
- **エージェント**が担うもの: メッセージの取得（`raft message check`）、返信（`raft message send`）、そのほか CLI を介した Raft とのやり取り全般。

アダプターは Raft の資格情報を保持しません。持つのは、ブリッジとエンドポイントの間で localhost 認証に使う、セッションごとの共有トークンだけです。
:::

---

## 前提条件 {#prerequisites}

- External Agent を作成できる **Raft ワークスペース**
- **Raft CLI** がインストール済みで、その External Agent のプロファイルにログインしていること
- **aiohttp** — Python パッケージ（Hermes の `[all]` extras に同梱）

Raft の Agents メニューを開いて External Agent を作成し、セットアップカードの案内どおりに Raft CLI をインストールしてエージェントのプロファイルにログインします。エージェントを作成すると、ゲートウェイの起動に必要な環境変数と設定をまとめた Hermes 向けの手引きが Raft 上に表示されます。

---

## セットアップ {#setup}

`~/.hermes/.env` に次を追加します。

```bash
RAFT_PROFILE=your-agent-profile
```

これだけです。`RAFT_PROFILE` が設定されていればアダプターは自動的に有効になります。セッションごとのブリッジトークンを生成し、空いているポートを選び、ゲートウェイの起動時にブリッジの子プロセスを自動で立ち上げます。

---

## しくみ {#how-it-works}

```
Raft Server → Bridge (wake-hints SSE) → POST /wake → Hermes Adapter → Agent context
Agent → raft message check → Raft Server (message bodies)
Agent → raft message send → Raft Server (replies)
```

1. Raft サーバーが SSE でブリッジプロセスへ起動ヒントを送ります。
2. ブリッジは各ヒントを `POST /wake` としてアダプターのループバックエンドポイントへ転送します。
3. アダプターはブリッジトークンを検証し、ペイロードに中身が含まれていないことを確かめたうえで、起動通知を Hermes のセッションへ差し込みます。
4. エージェントは起動通知を見て、Raft CLI でメッセージを読み、返信します。

起動時のペイロードは**取り決めとして中身を持ちません**。メタデータ（イベント ID、メッセージ ID、時刻）は運びますが、メッセージ本文・チャンネル名・送信者の情報は決して含みません。アダプターは、中身にあたるフィールド（`text`、`body`、`content`、`messages` など）を含むペイロードを拒否します。

---

## ブリッジ {#bridge}

アダプターは `raft agent bridge` を子プロセスとして自動的に起動し、エンドポイントの URL とトークンを渡します。ブリッジは指定されたプロファイルで Raft サーバーに接続し、起動ヒントの転送を始めます。ゲートウェイが終了すると、ブリッジも終了します。

---

## 環境変数 {#environment-variables}

| 変数 | 説明 | 既定値 |
|----------|-------------|---------|
| `RAFT_PROFILE` | Raft エージェントのプロファイル slug。設定するとアダプターが自動で有効になります | _(必須)_ |
