---
title: "ゲートウェイの内部構造"
description: "メッセージングゲートウェイが起動し、利用者を認可し、セッションを振り分け、メッセージを届けるまでの流れ"
upstream_path: developer-guide/gateway-internals.md
upstream_blob: 30c8cb9e1f09cd13eb9cd7e880e9fa99ebdceda2
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals
---

# ゲートウェイの内部構造 {#gateway-internals}

メッセージングゲートウェイは常駐し続けるプロセスで、統一されたアーキテクチャを通じて Hermes を 20 以上の外部メッセージングプラットフォームにつなぎます。

## 主要なファイル {#key-files}

| ファイル | 役割 |
|------|---------|
| `gateway/run.py` | `GatewayRunner` — メインループ、スラッシュコマンド、メッセージの振り分け（大きなファイルです。現在の行数は git で確認してください） |
| `gateway/session.py` | `SessionStore` — 会話の永続化とセッションキーの組み立て |
| `gateway/delivery.py` | 送信先のプラットフォームやチャンネルへの送信処理 |
| `gateway/pairing.py` | 利用者を認可するための DM ペアリングの流れ |
| `gateway/channel_directory.py` | cron の配信先として、チャット ID を人が読める名前に対応づけます |
| `gateway/hooks.py` | フックの検出、読み込み、ライフサイクルイベントの配信 |
| `gateway/mirror.py` | `send_message` のためのセッションをまたいだメッセージのミラーリング |
| `gateway/status.py` | プロファイル単位のゲートウェイインスタンスに対するトークンロックの管理 |
| `gateway/builtin_hooks/` | 常に登録されるフックの拡張ポイント（同梱のものはありません） |
| `gateway/platform_registry.py` | アダプタのレジストリ、ファクトリ、同梱プラットフォームプラグインの遅延ローダー |
| `plugins/platforms/<name>/` | 同梱のメッセージングアダプタ（ほとんどのプラットフォームは `adapter.py` + `plugin.yaml`） |
| `gateway/platforms/` | 共通の `base.py` と、旧来の直接アダプタ（Signal、API サーバー、Webhook など） |

## アーキテクチャの全体像 {#architecture-overview}

```text
┌─────────────────────────────────────────────────┐
│                  GatewayRunner                  │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Telegram │  │ Discord  │  │  Slack   │       │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │
│       └─────────────┼─────────────┘             │
│                     ▼                           │
│              _handle_message()                  │
│                     │                           │
│         ┌───────────┼───────────┐               │
│         ▼           ▼           ▼               │
│  Slash command   AIAgent    Queue/BG            │
│    dispatch      creation   sessions            │
│                     │                           │
│                     ▼                           │
│                 SessionStore                    │
│              (SQLite persistence)               │
└───────┴─────────────┴─────────────┴─────────────┘
```

## メッセージの流れ {#message-flow}

どのプラットフォームからメッセージが届いた場合も、次のように処理されます。

1. **プラットフォームアダプタ** が生のイベントを受け取り、`MessageEvent` に正規化します
2. **ベースアダプタ** が実行中セッションのガードを確認します:
   - このセッションでエージェントが動作中なら → メッセージをキューに入れ、割り込みイベントを立てます
   - `/approve`、`/deny`、`/stop` なら → ガードを迂回します（その場で処理されます）
3. **GatewayRunner._handle_message()** がイベントを受け取ります:
   - `_session_key_for_source()` でセッションキーを決めます（形式: `agent:main:{platform}:{chat_type}:{chat_id}`）
   - 認可を確認します（下記の「認可」を参照）
   - スラッシュコマンドかどうかを確認し、そうならコマンドハンドラへ渡します
   - エージェントがすでに動作中かを確認し、`/stop` や `/status` などのコマンドを横取りします
   - それ以外なら → `AIAgent` のインスタンスを作り、会話を実行します
4. **応答** はプラットフォームアダプタを通して返されます

### セッションキーの形式 {#session-key-format}

セッションキーには、振り分けに必要な情報がすべて入っています。

```
agent:main:{platform}:{chat_type}:{chat_id}
```

たとえば `agent:main:telegram:private:123456789` のようになります。

スレッドを持つプラットフォーム（Telegram のフォーラムトピック、Discord のスレッド、Slack のスレッド）では、chat_id の部分にスレッド ID が含まれることがあります。**セッションキーを自分で組み立てないでください** — 必ず `gateway/session.py` の `build_session_key()` を使ってください。

### 2 段構えのメッセージガード {#two-level-message-guard}

エージェントが動作している間、届いたメッセージは 2 つのガードを順に通ります。

1. **1 段目 — ベースアダプタ**（`gateway/platforms/base.py`）: `_active_sessions` を確認します。そのセッションが動作中なら、メッセージを `_pending_messages` に入れて割り込みイベントを立てます。これでゲートウェイランナーに届く *前* にメッセージを捕まえられます。

2. **2 段目 — ゲートウェイランナー**（`gateway/run.py`）: `_running_agents` を確認します。特定のコマンド（`/stop`、`/new`、`/queue`、`/status`、`/approve`、`/deny`）を横取りし、それぞれ適切に処理します。それ以外はすべて `running_agent.interrupt()` を呼び出します。

エージェントが処理中でもランナーに届く必要のあるコマンド（`/approve` など）は、`await self._message_handler(event)` で **その場で** 処理されます。競合状態を避けるため、バックグラウンドタスクの仕組みを通しません。

## 認可 {#authorization}

ゲートウェイは複数の層からなる認可を、次の順序で確認します。

1. **プラットフォームごとの全員許可フラグ**（例: `TELEGRAM_ALLOW_ALL_USERS`）— 設定されていれば、そのプラットフォームの利用者は全員認可されます
2. **プラットフォームの許可リスト**（例: `TELEGRAM_ALLOWED_USERS`）— カンマ区切りのユーザー ID
3. **DM ペアリング** — 認証済みの利用者が、ペアリングコードで新しい利用者を追加できます
4. **全体の全員許可**（`GATEWAY_ALLOW_ALL_USERS`）— 設定されていれば、すべてのプラットフォームの利用者が認可されます
5. **既定: 拒否** — 認可されていない利用者は拒否されます

### DM ペアリングの流れ {#dm-pairing-flow}

```text
Admin: /pair
Gateway: "Pairing code: ABC123. Share with the user."
New user: ABC123
Gateway: "Paired! You're now authorized."
```

ペアリングの状態は `gateway/pairing.py` が保存し、再起動しても残ります。

## スラッシュコマンドの振り分け {#slash-command-dispatch}

ゲートウェイのスラッシュコマンドは、すべて同じ解決の流れを通ります。

1. `hermes_cli/commands.py` の `resolve_command()` が、入力を正式な名前に対応づけます（別名や前方一致にも対応します）
2. その正式な名前が `GATEWAY_KNOWN_COMMANDS` に含まれるかを確認します
3. `_handle_message()` のハンドラが、正式な名前をもとに処理を振り分けます
4. 一部のコマンドは設定によって有効・無効が決まります（`CommandDef` の `gateway_config_gate`）

### 実行中エージェントのガード {#running-agent-guard}

エージェントが処理している間に実行してはいけないコマンドは、早い段階で拒否されます。

```python
if _quick_key in self._running_agents:
    if canonical == "model":
        return "⏳ Agent is running — wait for it to finish or /stop first."
```

迂回できるコマンド（`/stop`、`/new`、`/approve`、`/deny`、`/queue`、`/status`）には特別な処理があります。

## 設定の読み込み元 {#config-sources}

ゲートウェイは複数の場所から設定を読みます。

| 読み込み元 | 何が入っているか |
|--------|-----------------|
| `~/.hermes/.env` | API キー、ボットのトークン、プラットフォームの認証情報 |
| `~/.hermes/config.yaml` | モデルの設定、ツールの設定、表示に関する設定 |
| 環境変数 | 上記のいずれも上書きします |

CLI が既定値をコードに持つ `load_cli_config()` を使うのに対し、ゲートウェイは YAML ローダーで `config.yaml` を直接読みます。そのため、CLI の既定値には存在するが利用者の設定ファイルには書かれていないキーは、CLI とゲートウェイで挙動が変わることがあります。

## プラットフォームアダプタ {#platform-adapters}

ほとんどのメッセージングプラットフォームは、`plugins/platforms/<name>/adapter.py` にプラグインのアダプタとして同梱されています。一部の旧来のアダプタは今も `gateway/platforms/` に直接置かれています。いずれも `gateway/platforms/base.py` の `BasePlatformAdapter` を継承します。

```text
plugins/platforms/                  # plugin-packaged adapters (one dir each)
├── telegram/adapter.py     # Telegram Bot API (long polling or webhook)
├── discord/adapter.py      # Discord bot via discord.py
├── slack/adapter.py        # Slack Socket Mode
├── whatsapp/adapter.py     # WhatsApp Business Cloud API
├── matrix/adapter.py       # Matrix via mautrix (optional E2EE)
├── mattermost/adapter.py   # Mattermost WebSocket API
├── email/adapter.py        # Email via IMAP/SMTP
├── sms/adapter.py          # SMS via Twilio
├── dingtalk/adapter.py     # DingTalk WebSocket
├── feishu/adapter.py       # Feishu/Lark WebSocket or webhook
├── wecom/adapter.py        # WeCom (WeChat Work) callback
├── line/adapter.py         # LINE Messaging API
├── teams/adapter.py        # Microsoft Teams
├── irc/adapter.py          # IRC (canonical scoped-lock example)
├── homeassistant/adapter.py # Home Assistant conversation integration
└── …                       # google_chat, ntfy, photon, raft, simplex, …

gateway/platforms/                  # core base + legacy direct adapters
├── base.py              # BasePlatformAdapter — shared logic for all platforms
├── signal.py            # Signal via signal-cli REST API
├── weixin.py            # Weixin (personal WeChat) via iLink Bot API
├── bluebubbles.py       # Apple iMessage via BlueBubbles macOS server
├── qqbot/               # QQ Bot (Tencent QQ) via Official API v2 (sub-package)
├── yuanbao.py           # Yuanbao (Tencent) DM/group adapter
├── msgraph_webhook.py   # Microsoft Graph change-notification webhook (Teams, Outlook, etc.)
├── webhook.py           # Inbound/outbound webhook adapter
└── api_server.py        # REST API server adapter
```

**遅延読み込み:** 同梱の `kind: platform` プラグインは、`gateway/platform_registry.py` に軽い `register_deferred` ローダーを登録します（`hermes_cli/plugins.py` 経由）。これにより、プラットフォームの SDK はゲートウェイの起動時、送信時、セットアップや状態確認の実行時にだけ読み込まれ、単なる `hermes chat` では読み込まれません。名前を引いたときに該当するアダプタだけが読み込まれ、すべてのプラットフォームを必要とする処理でのみ、待機中のローダーが一括で実行されます。

コネクタを介する実験的なプラットフォームは、専用のプラットフォームモジュールではなく `gateway/relay/` の汎用リレーアダプタを使います。`GATEWAY_RELAY_URL` または `gateway.relay_url` が設定されていると、ゲートウェイは `relay` プラットフォームを登録し、外向きの WebSocket でコネクタに接続して、同じソケット上で `descriptor`、`inbound`、`interrupt_inbound` のフレームを受け取ります。コネクタは `CapabilityDescriptor` を提示します。Hermes 側からは通常の応答の送信に加えて、トークンを伴わない `follow_up` 操作や割り込みフレームをリレー経由で返せます。ソースに基づいた通信仕様は [`docs/relay-connector-contract.md`](https://github.com/NousResearch/hermes-agent/blob/main/docs/relay-connector-contract.md) にあります。

アダプタは共通のインターフェースを実装します。
- `connect()` / `disconnect()` — 接続の開始と終了
- `send()` — 外向きのメッセージ送信
- 受信したイベントは `MessageEvent` に正規化され、`handle_message()` を通じて渡されます

### トークンロック {#token-locks}

固有の認証情報で接続するアダプタは、`connect()` で `acquire_scoped_lock()` を、`disconnect()` で `release_scoped_lock()` を呼びます。これにより、2 つのプロファイルが同じボットトークンを同時に使うことを防ぎます。

## 送信の経路 {#delivery-path}

外向きの送信（`gateway/delivery.py`）では、次を扱います。

- **直接の返信** — 送信元のチャットに応答を返します
- **ホームチャンネルへの配信** — cron ジョブの出力やバックグラウンド処理の結果を、設定したホームチャンネルに送ります
- **送信先を指定した配信** — 送信エンジンが `telegram:-1001234567890` のように指定するもので、シェルスクリプト向けには [`hermes send` CLI](/hermes/docs/guides/pipe-script-output/) から、cron からは `deliver:` の送信先として使えます
- **プラットフォームをまたぐ配信** — 元のメッセージとは別のプラットフォームに届けます

cron ジョブの配信内容は、ゲートウェイのセッション履歴にはミラーされません。cron 自身のセッションだけに残ります。これはメッセージの交互配置の規則を壊さないための、意図した設計です。

## フック {#hooks}

ゲートウェイのフックは、ライフサイクルイベントに反応する Python モジュールです。

### ゲートウェイのフックイベント {#gateway-hook-events}

| イベント | 発火するタイミング |
|-------|-----------|
| `gateway:startup` | ゲートウェイのプロセスが起動したとき |
| `session:start` | 新しい会話セッションが始まったとき |
| `session:end` | セッションが終わった、または時間切れになったとき |
| `session:reset` | 利用者が `/new` でセッションをリセットしたとき |
| `agent:start` | エージェントがメッセージの処理を始めたとき |
| `agent:step` | エージェントがツール呼び出しの 1 周を終えたとき |
| `agent:end` | エージェントが処理を終えて応答を返したとき |
| `command:*` | いずれかのスラッシュコマンドが実行されたとき |

フックは `gateway/builtin_hooks/`（拡張ポイントで、配布物では現在は空です。`_register_builtin_hooks()` は何もしないスタブです）と `~/.hermes/hooks/`（利用者が入れたもの）から見つけられます。各フックは `HOOK.yaml` マニフェストと `handler.py` を持つディレクトリです。

## メモリプロバイダとの連携 {#memory-provider-integration}

メモリプロバイダのプラグイン（Honcho など）が有効なとき、次のように動きます。

1. ゲートウェイはメッセージごとに、セッション ID を持つ `AIAgent` を作ります
2. `MemoryManager` が、そのセッションの文脈でプロバイダを初期化します
3. プロバイダのツール（`honcho_profile`、`viking_search` など）は次の経路で呼ばれます:

```text
AIAgent._invoke_tool()
  → self._memory_manager.handle_tool_call(name, args)
    → provider.handle_tool_call(name, args)
```

4. セッションの終了やリセット時には `on_session_end()` が発火し、後片付けと最後のデータ書き出しを行います

### メモリ書き出しのライフサイクル {#memory-flush-lifecycle}

セッションがリセット、再開、または時間切れになったとき:
1. 組み込みのメモリがディスクに書き出されます
2. メモリプロバイダの `on_session_end()` フックが発火します
3. 一時的な `AIAgent` が、メモリのためだけの会話を 1 ターン実行します
4. その文脈は破棄されるか、保管されます

## バックグラウンドの保守処理 {#background-maintenance}

ゲートウェイは、メッセージの処理と並行して定期的な保守を行います。

- **cron の刻み** — ジョブのスケジュールを確認し、時間になったジョブを実行します
- **セッションの期限切れ** — 放置されたセッションを時間切れ後に片付けます
- **メモリの書き出し** — セッションが期限切れになる前に、先回りしてメモリを書き出します
- **キャッシュの更新** — モデル一覧とプロバイダの状態を取り直します

## プロセスの管理 {#process-management}

ゲートウェイは常駐プロセスとして動き、次の方法で管理します。

- `hermes gateway start` / `hermes gateway stop` — 手動での操作
- `systemctl`（Linux）や `launchctl`（macOS）— サービスとしての管理
- `~/.hermes/gateway.pid` の PID ファイル — プロファイル単位のプロセス管理

**プロファイル単位と全体の違い**: `start_gateway()` はプロファイル単位の PID ファイルを使います。`hermes gateway stop` は現在のプロファイルのゲートウェイだけを止めます。`hermes gateway stop --all` は全体を対象に `ps aux` で走査し、すべてのゲートウェイプロセスを止めます（更新時に使われます）。

## 関連ドキュメント {#related-docs}

- [セッションストレージ](/hermes/docs/developer-guide/session-storage/)
- [cron の内部構造](/hermes/docs/developer-guide/cron-internals/)
- [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/)
- [エージェントループの内部構造](/hermes/docs/developer-guide/agent-loop/)
- [メッセージングゲートウェイ（利用ガイド）](/hermes/docs/user-guide/messaging/)
